# CRM Document Templates - Complete Reference Guide

## Overview
This document provides a comprehensive reference for all document templates available in the MELITECH SOLUTIONS CRM system. Each template is customized with document-specific fields, metadata, and terms & conditions relevant to the document type.

---

## A. FINANCIAL DOCUMENTS

### 1. **INVOICE** (`Invoice-template.html`)
**Purpose:** Bill customers for goods/services sold

**Document-Specific Fields:**
- Invoice #, Invoice Date, Due Date
- Customer/Bill To details
- Item list with quantities and prices
- Tax calculations and totals

**Unique T&Cs:**
- Payment terms (30 days)
- Late payment penalties (1.5% monthly interest)
- Tax compliance per KRA regulations
- Payment methods accepted
- Dispute resolution timeframe

**Use Cases:** Regular sales transactions, product deliveries

---

### 2. **RECEIPT / PAYMENT RECEIPT** (`receipt-template.html`)
**Purpose:** Acknowledge payment received from customers

**Document-Specific Fields:**
- Receipt #, Date Received, Payment Method
- Payer details
- Payment amount and method used
- Reference to original invoice

**Unique T&Cs:**
- Receipt validity (5 years)
- Payment confirmation statement
- Dispute period (7 days)
- Tax compliance documentation

**Use Cases:** Cash receipts, cheque confirmations, payment acknowledgments

---

### 3. **CREDIT NOTE** (`credit-note-template.html`)
**Purpose:** Reduce customer invoice amounts (returns, discounts, adjustments)

**Document-Specific Fields:**
- Credit Note #, Related Invoice reference
- Reason for credit (returns, discount, error, etc.)
- Items/services reversed
- Subtotal and VAT calculations
- Credit application method

**Unique T&Cs:**
- Credit validity period (90 days)
- Application to next invoice or refund
- Non-transferable credit
- Tax adjustment documentation

**Use Cases:** Returned goods, service cancellations, billing corrections, adjustments

---

### 4. **DEBIT NOTE** (`debit-note-template.html`)
**Purpose:** Claim adjustments from suppliers for quality issues or underdelivery

**Document-Specific Fields:**
- Debit Note #, Related Invoice/PO reference
- Reason for debit (quality issue, shortage, damage, etc.)
- Items/services claimed
- Settlement instructions

**Unique T&Cs:**
- Claim settlement period (30 days)
- Supporting documentation requirement
- Dispute resolution (14 days)
- Impact on future orders if unresolved

**Use Cases:** Quality claims, underdeliveries, damage claims, return deductions

---

### 5. **SERVICE INVOICE** (`service-invoice-template.html`)
**Purpose:** Bill customers for services rendered (consulting, support, maintenance)

**Document-Specific Fields:**
- Service period and location
- Service description
- Hours/units worked, service rates
- Tax and totals
- Additional notes section

**Unique T&Cs:**
- Payment terms for services (30 days)
- Service acceptance period (7 days)
- Dispute period (14 days)
- Scope change charges
- Warranty on services

**Use Cases:** Consulting fees, IT support services, maintenance contracts, training

---

### 6. **EXPENSE CLAIM** (`expense-claim-template.html`)
**Purpose:** Employees claim reimbursement for business expenses

**Document-Specific Fields:**
- Claim #, Claim period, Claim purpose
- Employee details and manager
- Itemized expenses by category
- Supporting documents checklist
- Approval signatures (employee, manager, finance)

**Unique T&Cs:**
- Submission deadline (30 days)
- Supporting documents mandatory
- Expense policy compliance
- No personal expense reimbursement
- Payment timeline (5-7 business days)
- Fraudulent claims investigation

**Use Cases:** Travel expenses, meals, office supplies, conference registration, transport

---

## B. PURCHASING DOCUMENTS

### 7. **PURCHASE ORDER (PO)** (`order-template.html`)
**Purpose:** Authorize purchase of goods/services from vendors

**Document-Specific Fields:**
- PO #, Order Date, Required Delivery Date
- Vendor/Supplier details
- Delivery location and contact
- Item list with quantities and prices
- Total cost breakdown

**Unique T&Cs:**
- Order binding upon acceptance
- Quality standards requirement
- Delivery date enforcement
- Fixed pricing guarantee
- 90-day warranty on goods
- Legal compliance certification

**Use Cases:** General procurement, vendor orders, supply chain purchases

---

### 8. **LOCAL PURCHASE ORDER (LPO)** (`lpo-template.html`)
**Purpose:** Order goods/services from local suppliers with specific terms

**Document-Specific Fields:**
- LPO #, Order Date, Required Delivery
- Supplier details and registration
- Delivery address and contact
- Item specifications and quantities
- Delivery terms

**Unique T&Cs:**
- Supplier compliance with laws/taxes
- Quality assurance mandatory
- Late delivery cancellation
- Inspection upon delivery
- Defective item replacement
- 14-day late delivery threshold

**Use Cases:** Local vendor procurement, domestic supplies, materials

---

### 9. **QUOTATION / REQUEST FOR QUOTATION (RFQ)** (`quotation-rfq-template.html`)
**Purpose:** Request pricing proposals from vendors

**Document-Specific Fields:**
- RFQ #, Date, Response Deadline
- Vendor to quote
- Items/services requiring quotes
- Detailed specifications
- Response requirements

**Unique T&Cs:**
- Response deadline mandatory
- Quote validity (minimum 30 days)
- Complete information requirement
- Pricing breakdown mandatory
- Non-binding nature
- Can reject any/all quotes

**Use Cases:** Price negotiation, vendor comparison, procurement decisions

---

### 10. **QUOTATION / ESTIMATE** (`estimate-template.html`)
**Purpose:** Provide formal pricing estimate to prospective customers

**Document-Specific Fields:**
- Quotation #, Date, Valid Until
- Quote To customer details
- Item list with prices
- Total quoted amount
- Payment terms

**Unique T&Cs:**
- Quote validity period
- Written acceptance required
- Price guarantee for scope
- 50% deposit on order
- Revisions may incur charges
- Warranty on delivered items
- Force majeure clause

**Use Cases:** Sales quotations, project estimates, pricing proposals

---

## C. RECEIVING & DELIVERY DOCUMENTS

### 11. **GOODS RECEIVED NOTE (GRN)** (`grn-template.html`)
**Purpose:** Document receipt and inspection of goods from suppliers

**Document-Specific Fields:**
- GRN #, Date Received, Related PO
- Supplier details and invoice reference
- Receiving employee and department
- Inspection status (Passed/Failed/Conditional)
- Remarks on condition

**Unique T&Cs:**
- Receipt confirmation on delivery
- 7-day inspection period
- Damage claims (3-day window)
- Quantity tolerance (±5%)
- Conditional status holds payment
- Permanent inventory record
- Subject to audit verification

**Use Cases:** Receiving goods, quality control, inventory tracking, supplier audits

---

### 12. **DELIVERY NOTE (DN)** (`dn-template.html`)
**Purpose:** Accompany goods in transit, confirm delivery to recipient

**Document-Specific Fields:**
- DN #, Date, Related Invoice/PO
- Consignor/Sender details
- Consignee/Receiver details
- Item descriptions and quantities
- Receiver signature line
- Date received field

**Unique T&Cs:**
- Item verification at delivery
- Damage reporting (24 hours mandatory)
- Receiver signature confirmation
- Discrepancy reporting requirement
- Company not liable after 24 hours
- Insurance validity to delivery point

**Use Cases:** Shipping documents, proof of delivery, in-transit goods tracking

---

## D. EMPLOYEE & ASSET DOCUMENTS

### 13. **ASSET ALLOCATION RECEIPT** (`assets-template.html`)
**Purpose:** Document asset allocation to employees with custodianship terms

**Document-Specific Fields:**
- Asset Tag #, Allocation Date, Insurance Valid Till
- Asset details (description, serial #, category, cost)
- Employee/Custodian details
- Condition assessment
- Acknowledgment signature

**Unique T&Cs:**
- Employee sole custodian responsibility
- Authorized business use only
- Insurance company maintained
- Maintenance required at employee cost
- Replacement liability for negligence
- Return in good condition required
- Serial number tracking
- Periodic audit rights

**Use Cases:** Equipment allocation, IT asset tracking, company property distribution

---

### 14. **IMPREST ADVANCE REQUEST** (`imprest-template.html`)
**Purpose:** Authorize employee advances for business activities

**Document-Specific Fields:**
- Imprest #, Date, Settlement Due
- Employee details (ID, department, manager)
- Amount requested and purpose
- Destination/Activity details
- Approval signature

**Unique T&Cs:**
- Amount for stated purpose only
- 60-day settlement deadline
- Original receipts required
- Personal accountability
- Unspent refund requirement
- Deduction from payroll if not settled
- Finance approval required

**Use Cases:** Travel advances, business trips, project advances, operational funds

---

## E. OPERATIONAL & SERVICE DOCUMENTS

### 15. **WORK ORDER / SERVICE TICKET** (`work-order-template.html`)
**Purpose:** Authorize and track service work execution

**Document-Specific Fields:**
- Work Order #, Date, Priority level
- Client/Requester details
- Work Type (Installation/Maintenance/Repair/etc.)
- Equipment/System being serviced
- Work schedule (start, end, duration)
- Assigned team members
- Materials and resources required
- Estimated costs (materials, labor, service charge)
- Sign-off approval section

**Unique T&Cs:**
- Work scope as described only
- Schedule dates are estimates
- Payment upon completion (30 days)
- 30-day warranty on materials
- Client responsible for site access/safety
- Change orders required for scope changes
- 48-hour cancellation notice

**Use Cases:** Service requests, maintenance work, installation projects, support tickets

---

## F. DOCUMENT RELATIONSHIPS & WORKFLOW

### Order-to-Cash Workflow:
1. QUOTATION → 2. PURCHASE ORDER → 3. DELIVERY NOTE → 4. GOODS RECEIVED NOTE → 5. INVOICE → 6. RECEIPT

### Purchase-to-Pay Workflow:
1. RFQ → 2. QUOTATION → 3. LOCAL PURCHASE ORDER → 4. DELIVERY NOTE → 5. GOODS RECEIVED NOTE → 6. INVOICE/DEBIT NOTE → 7. PAYMENT

### Adjustment Workflows:
- INVOICE → CREDIT NOTE (for customer over-billing)
- SUPPLIER INVOICE ← DEBIT NOTE (for supplier under-delivery/quality issues)

---

## G. TEMPLATE CUSTOMIZATION GUIDE

### Each Template Contains:

1. **Header Section:**
   - Company branding and logo placeholder
   - Company contact information
   - Professional company details

2. **Document Metadata:**
   - Unique document number (auto-incrementing)
   - Issue/Transaction date
   - Relevant dates (due, delivery, valid until, etc.)

3. **Party Details:**
   - Customer/Supplier/Employee information
   - Contact details and tax registration
   - Addresses and location information

4. **Body Content:**
   - Document-specific sections and tables
   - Item/service descriptions and quantities
   - Pricing and totals calculations
   - Additional details or notes

5. **Terms & Conditions:**
   - Document-type specific legal terms
   - Payment terms and conditions
   - Dispute resolution and claims procedures
   - Tax compliance statements
   - Warranty or liability terms
   - Approval and sign-off requirements

6. **Footer Section:**
   - Company contact information
   - Support channels
   - Additional reference information

7. **Print Functionality:**
   - Professional print button
   - CSS media queries for print optimization
   - Hidden web interface elements in print

---

## H. IMPLEMENTATION RECOMMENDATIONS

### 1. **Integration Points:**
- Link templates to document generation in backend
- Auto-populate fields from database (company info, customers, items)
- Auto-increment document numbers per type
- Link invoices to delivery notes to GRNs for traceability

### 2. **Permissions & Access:**
- Restrict document types by user role
- Ensure only authorized users can create certain documents
- Track document creation and modifications
- Approval workflows for high-value documents

### 3. **Storage & Archival:**
- Store generated PDFs with document metadata
- Link documents to GL accounts for accounting
- Maintain audit trail for compliance
- Retention policies per document type

### 4. **Reporting & Analytics:**
- Track invoice aging (payment terms compliance)
- Monitor expense claims processing time
- Analyze purchase order performance
- Quality metrics from GRN/DN documents

---

## I. MISSING TEMPLATE NOTES

Consider developing additional templates for:
- Purchase Invoice (for internal cost tracking)
- Cash Journal / Cash Receipts Register
- Bank Reconciliation Statement
- Approval Matrix / Authority Limits Form
- Contract Templates
- Employee Onboarding Checklist
- Training Certificates
- Leave Applications
- Travel Request & Approval
- Bid/Tender Documents
- Compliance Certificates

---

## Template Summary Table

| # | Document Type | File Name | Primary Purpose | Document Number Prefix |
|---|---|---|---|---|
| 1 | Invoice | Invoice-template.html | Customer billing | INV- |
| 2 | Receipt | receipt-template.html | Payment acknowledgment | RCP- |
| 3 | Credit Note | credit-note-template.html | Billing adjustments | CN- |
| 4 | Debit Note | debit-note-template.html | Supplier claims | DN- |
| 5 | Service Invoice | service-invoice-template.html | Service billing | SI- |
| 6 | Expense Claim | expense-claim-template.html | Reimbursement requests | EXP- |
| 7 | Purchase Order | order-template.html | Vendor orders | PO- |
| 8 | Local PO | lpo-template.html | Local purchases | LPO- |
| 9 | RFQ | quotation-rfq-template.html | Price requests | RFQ- |
| 10 | Quotation | estimate-template.html | Customer quotes | QT- |
| 11 | GRN | grn-template.html | Goods receiving | GRN- |
| 12 | Delivery Note | dn-template.html | Delivery tracking | DN- |
| 13 | Asset Receipt | assets-template.html | Asset allocation | AST- |
| 14 | Imprest | imprest-template.html | Expense advances | IMP- |
| 15 | Work Order | work-order-template.html | Service authorization | WO- |

---

**Last Updated:** March 2025
**Version:** 1.0
**Maintenance:** Engineering Department / Finance Department
