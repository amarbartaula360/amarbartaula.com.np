
import { NextResponse } from "next/server";
import { getBhalaiKoshPool } from "@/lib/bhalai-kosh-db";
import { getBhalaiKoshSession } from "@/lib/bhalai-kosh-auth";
export const runtime = "nodejs";
const STAFF = [[36,"AMAR BARTAULA","0620100000233041"],[43,"ANU UPERKOTI","0620100004332041"],[33,"ANUJ DHUNGANA","0620100001677041"],[11,"ASHIFA KHATUN","0620100000007046"],[8,"ASMITA PUDASAINI","0620100001418041"],[6,"BABITA BARTAULA","0620100001554041"],[14,"BIMALA BUDATHOKI","0620100000617035"],[24,"BISHAL SUBEDI","0620100000168041"],[30,"BISHNU HARI SUBEDI","0620100000178041"],[35,"BISSU SYANBO","0620100000174041"],[12,"CHANDRA KALA MOKTAN","0620100000011046"],[38,"GIRI RAJ DHAKAL","0620100000148041"],[18,"GITA PURI","0620100002663041"],[39,"ISHOR KARKI","0620100000232041"],[45,"JAMUNA KUMARI ADHIKARI","0620100000182041"],[16,"JASMINA PULAMI","0620100000166041"],[22,"JOEL SYANGBO","0620100002919041"],[31,"JUMMA DIN MIYA","0620100000184041"],[23,"KABITA OJHA","0620100000162041"],[41,"KRISHNA MAYA SUBEDI","0620100000218041"],[46,"KUMARI RAI","0620100000181041"],[4,"LAXMI B.K","0620100003938041"],[15,"LAXMI PAUDEL","0620100000158041"],[9,"MADHVI KANDEL","0620100001062041"],[7,"MANJU BALAMI","0620100000180041"],[29,"MATRIKA PRASAD DHUNGANA","0620100000248041"],[20,"MENUKA DULAL","0620100002647041"],[2,"MIKI PARIYAR","0620100001056041"],[5,"MINA GIRI","0620100000287041"],[34,"NISTHA GOLE","0620100000505010"],[21,"PABITRA GHIMIRE","0620100002644041"],[37,"PASHURAM ARYAL","0620100000204041"],[10,"PRAMILA UPRETI","0620100000169041"],[3,"PREM KUMARI DHUNGANA","0620100001333041"],[26,"RACHANA GOPALI","0620100000163041"],[32,"RAJESH MAHATO","0620100004176041"],[51,"RAJIV THING","0340100004874041"],[40,"RAM BAHADUR GOLE","0620100000176041"],[48,"SABITA PRAJA","0620100000183041"],[17,"SACHITA NEPAL","0620100002645041"],[13,"SAMIKSHA THING","0620100001519035"],[19,"SANGITA PAUDEL","0620100002338041"],[42,"SARASWOTI BHANDARI","0620100000006046"],[47,"SITA ARYAL","0620100000070045"],[1,"SRIJANA GIRI","0620100000160041"],[28,"SUMAN ADHIKARI","0620100003955041"],[25,"SUSHILA MAINALI","0620100000159041"],[52,"SHYAM BAHADUR RAI",null],[53,"MANISHA TIWARI",null],[null,"GEETA WAIBA",null],[null,"SUSMITA RAUT",null],[null,"BIBEK BASTOLA",null]];
const PERIODS = [
  {year:2083,month:4,paidOn:"2026-08-16",bs:"२०८३ साउन ३१"},
  {year:2083,month:5,paidOn:"2026-09-16",bs:"२०८३ भदौ ३१"},
  {year:2083,month:6,paidOn:"2026-10-17",bs:"२०८३ असोज ३१"},
  {year:2083,month:7,paidOn:"2026-11-16",bs:"२०८३ कात्तिक ३०"}
];
export async function POST() {
  const s=await getBhalaiKoshSession();
  if(!s?.oid) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!["admin","super_admin"].includes(s.role)) return NextResponse.json({error:"Admin अनुमति आवश्यक छ।"},{status:403});
  const db=getBhalaiKoshPool(), c=await db.connect();
  let createdMembers=0, matchedMembers=0, createdSavings=0, skippedSavings=0, vouchers=0;
  const details=[];
  try {
    await c.query("BEGIN");
    const accounts=await c.query("SELECT account_code,id FROM chart_of_accounts WHERE organization_id=$1 AND account_code IN ('1001','2001')",[s.oid]);
    const ac=Object.fromEntries(accounts.rows.map(x=>[x.account_code,x.id]));
    if(!ac["1001"]||!ac["2001"]) throw new Error("Cash वा Member Fund account setup भेटिएन।");
    for(let i=0;i<STAFF.length;i++){
      const [serial,name,bank]=STAFF[i];
      const generatedCode=serial?("UEBS-"+String(serial).padStart(3,"0")):("UEBS-"+name.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/[^A-Z0-9]+/g,"-").replace(/^-|-$/g,""));
      let found=await c.query("SELECT id,member_code FROM members WHERE organization_id=$1 AND (member_code=$2 OR lower(full_name)=lower($3)) ORDER BY (member_code=$2) DESC LIMIT 1 FOR UPDATE",[s.oid,generatedCode,name]);
      let memberId;
      if(found.rowCount){
        memberId=found.rows[0].id; matchedMembers++;
        await c.query("UPDATE members SET full_name=$3, bank_account_no=COALESCE(NULLIF($4,''),bank_account_no),status=CASE WHEN status='left' THEN 'active' ELSE status END,updated_at=now() WHERE id=$1 AND organization_id=$2",[memberId,s.oid,name,bank]);
      } else {
        const ins=await c.query("INSERT INTO members(organization_id,member_code,full_name,bank_account_no,status,joined_on,created_by) VALUES($1,$2,$3,$4,'active',CURRENT_DATE,$5) RETURNING id",[s.oid,generatedCode,name,bank,s.uid||null]);
        memberId=ins.rows[0].id; createdMembers++;
      }
      for(const p of PERIODS){
        const old=await c.query("SELECT id,amount FROM savings WHERE organization_id=$1 AND member_id=$2 AND period_year=$3 AND period_month=$4 FOR UPDATE",[s.oid,memberId,p.year,p.month]);
        if(old.rowCount){skippedSavings++;continue;}
        const voucherNo="BK-OLD-"+p.year+"-"+p.month+"-"+generatedCode;
        const v=await c.query(`INSERT INTO vouchers(organization_id,voucher_no,voucher_type,voucher_date,narration,reference_type,reference_id,status,created_by,posted_at)
          VALUES($1,$2,'receipt',$3,$4,'saving',$5,'posted',$6,now()) RETURNING id`,
          [s.oid,voucherNo,p.paidOn,"पुरानो मासिक बचत - "+p.bs+" - "+name,memberId,s.uid||null]);
        const vid=v.rows[0].id;
        await c.query("INSERT INTO voucher_lines(voucher_id,account_id,member_id,debit,credit,narration) VALUES($1,$2,$3,1000,0,$4),($1,$5,$3,0,1000,$4)",
          [vid,ac["1001"],memberId,"पुरानो बचत "+p.bs,ac["2001"]]);
        await c.query(`INSERT INTO savings(organization_id,member_id,period_year,period_month,amount,paid_on,payment_method,receipt_no,status,received_by,notes)
          VALUES($1,$2,$3,$4,1000,$5,'cash',$6,'posted',$7,$8)`,
          [s.oid,memberId,p.year,p.month,p.paidOn,voucherNo,s.uid||null,"पुरानो अभिलेखबाट प्रविष्टि"]);
        await c.query(`INSERT INTO member_ledger(organization_id,member_id,voucher_id,transaction_date,transaction_type,credit,narration)
          VALUES($1,$2,$3,$4,'contribution',1000,$5)`,
          [s.oid,memberId,vid,p.paidOn,"मासिक बचत "+p.bs]);
        createdSavings++;vouchers++;
      }
      details.push({name,memberCode:generatedCode,bankAccount:bank||null});
    }
    await c.query("COMMIT");
    return NextResponse.json({ok:true,createdMembers,matchedMembers,createdSavings,skippedSavings,vouchers,totalStaff:STAFF.length,monthlyAmount:1000,totalRecorded:createdSavings*1000,details});
  }catch(e){await c.query("ROLLBACK");console.error("Bhalai initial import:",e.message);return NextResponse.json({error:e.message||"प्रारम्भिक विवरण राख्न सकिएन।"},{status:500});}
  finally{c.release();}
}
