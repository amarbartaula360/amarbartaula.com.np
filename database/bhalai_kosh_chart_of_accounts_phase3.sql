-- Bhalai Kosh: Chart of Accounts update
-- Run in the same Neon database used by Bhalai Kosh.
-- Adds loan, member-fund, welfare and operating accounts for every organization.
BEGIN;

INSERT INTO chart_of_accounts (organization_id, account_code, account_name, account_type)
SELECT o.id, v.code, v.name, v.type
FROM organizations o
CROSS JOIN (VALUES
  ('1001','Cash in Hand - नगद','asset'),
  ('1002','Bank Account - बैंक मौज्दात','asset'),
  ('1101','Loan Receivable - सदस्य ऋण असुली','asset'),
  ('1102','Interest Receivable - उठ्न बाँकी ब्याज','asset'),
  ('1103','Other Receivables - अन्य उठ्ती','asset'),
  ('2001','Refundable Member Fund - फिर्ता योग्य सदस्य कोष','liability'),
  ('2002','Member Savings Payable - सदस्य बचत दायित्व','liability'),
  ('2003','Loan Security Deposit Payable - ऋण धरौटी दायित्व','liability'),
  ('2004','Other Member Payables - सदस्यलाई भुक्तानी दिनुपर्ने','liability'),
  ('3001','Welfare Fund Capital - कल्याण कोष पूँजी','equity'),
  ('3002','Accumulated Surplus - सञ्चित बचत/नाफा','equity'),
  ('4001','Interest Income - ऋण ब्याज आम्दानी','income'),
  ('4002','Other Income - अन्य आम्दानी','income'),
  ('4003','Loan Processing Fee Income - ऋण सेवा शुल्क आम्दानी','income'),
  ('4004','Late Fee and Penalty Income - ढिलाइ तथा जरिवाना आम्दानी','income'),
  ('5001','Medical Support Expense - स्वास्थ्य सहायता खर्च','expense'),
  ('5002','Accident Support Expense - दुर्घटना सहायता खर्च','expense'),
  ('5003','Death Relief Expense - मृत्यु राहत खर्च','expense'),
  ('5004','Other Welfare Expense - अन्य कल्याण खर्च','expense'),
  ('5005','Bank Charges - बैंक शुल्क','expense'),
  ('5006','Administrative Expense - प्रशासनिक खर्च','expense'),
  ('5007','Loan Loss Provision Expense - ऋण जोखिम व्यवस्था खर्च','expense')
) AS v(code,name,type)
ON CONFLICT (organization_id, account_code)
DO UPDATE SET account_name=EXCLUDED.account_name, account_type=EXCLUDED.account_type;

COMMIT;

-- Verify the active chart of accounts:
SELECT account_code, account_name, account_type, is_active
FROM chart_of_accounts
WHERE organization_id = 1
ORDER BY account_code;
