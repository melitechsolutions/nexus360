# Complete Platform Audit: Backend Routers, Schema & Frontend Alignment

## Audit Status: IN PROGRESS

### Priority 1: Core Financial/Accounting Entities

#### 1. CLIENTS
**Router:** `server/routers/clients.ts`
**Schema:** `drizzle/schema.ts` - `clients` table
**Frontend:** EditClient.tsx, CreateClient.tsx

**Schema vs Frontend MISMATCH:**
- ✅ FIXED: Extended EditClient.tsx to include:
  - Business Details section: businessType, registrationNumber, businessLicense, yearEstablished, numberOfEmployees, creditLimit, paymentTerms
  - Banking Details section: bankName, bankCode, branch
- ✅ Present in both: companyName, contactPerson, email, phone, address, city, country, postalCode, taxId, website, industry, status, notes

**ACTION COMPLETED:**
- ✅ Extended EditClient form with Business Details section (businessType, registrationNumber, businessLicense, yearEstablished, numberOfEmployees, creditLimit, paymentTerms)
- ✅ Added Banking Details section (bankName, bankCode, branch)
- ✅ Updated form state to include all new fields
- ✅ Updated useEffect hook to populate new fields from clientData
- ✅ Build verified: ✅ Exit code 0, all 194 pages compile

**NEXT STEP:** 
- [ ] Extend CreateClient.tsx with same business/banking details sections
- [ ] Verify backend router accepts all these fields in create/update mutations
- [ ] Add form validations for numeric fields (creditLimit, numberOfEmployees, yearEstablished)

---

#### 2. INVOICES
**Router:** `server/routers/invoices.ts`
**Schema:** `drizzle/schema.ts` - `invoices` table + `invoiceItems` table
**Frontend:** Invoices listing, Estimate/Invoice creation workflows

**Schema Fields:**
- id, invoiceNumber, clientId, estimateId, title, status (draft/sent/paid/partial/overdue/cancelled)
- issueDate, dueDate, subtotal, taxAmount, discountAmount, total, paidAmount
- notes, terms, createdBy, paymentPlanId
- Related: invoiceItems (itemType, itemId, description, quantity, unitPrice, taxRate, discountPercent)

**TO VERIFY:**
- [ ] Check if all invoice status values are handled in frontend
- [ ] Verify payment plan link is used in workflows
- [ ] Confirm invoice item line calculations (subtotal, tax, discount, total)

---

#### 3. PAYMENTS
**Router:** `server/routers/payments.ts`
**Schema:** `drizzle/schema.ts` - `payments` table (line 2051)
**Frontend:** Payments management, Payment recording

**ACTION REQUIRED:**
- [ ] Read full payments schema definition
- [ ] Verify all payment methods in schema vs frontend
- [ ] Check payment approval workflows
- [ ] Validate reference number generation

---

### Priority 2: HR/Operations Entities

#### 4. EMPLOYEES
**Router:** `server/routers/employees.ts`
**Schema:** Includes: employeeNumber, firstName, lastName, email, phone, dateOfBirth, hireDate, department, position, jobGroupId, salary, employmentType (full_time/part_time/contract/intern/etc), status (active/on_leave/terminated/suspended), bankAccountNumber, taxId, nationalId

**ACTION REQUIRED:**
- [ ] Verify employee edit form covers all fields
- [ ] Check employment type options match enum
- [ ] Validate payroll/salary data handling

---

#### 5. LEAVE REQUESTS
**Router:** `server/routers/leave.ts`
**Schema:** leaveType (annual/sick/maternity/paternity/unpaid/other), startDate, endDate, days, status (pending/approved/rejected/cancelled), approvedBy

**ACTION REQUIRED:**
- [ ] Verify leave request form includes all fields
- [ ] Check approval workflow implementation
- [ ] Validate date calculations (days calculation)

---

#### 6. ATTENDANCE
**Router:** `server/routers/attendance.ts`
**Schema:** TBD - verify structure
**Frontend:** Attendance tracking, Reports

**ACTION REQUIRED:**
- [ ] Read attendance schema
- [ ] Check attendance form/recording UI
- [ ] Verify time-based calculations

---

### Priority 3: Procurement/Inventory

#### 7. PRODUCTS
**Router:** `server/routers/products.ts`
**Schema:** productName, description, sku, unitPrice, quantity, category, status (active/inactive)
**Frontend:** Product management forms

**ACTION REQUIRED:**
- [ ] Verify product form matches schema
- [ ] Check category dropdown options
- [ ] Validate pricing and stock calculations

---

#### 8. SUPPLIERS
**Router:** `server/routers/suppliers.ts`
**Schema:** TBD
**Frontend:** Supplier management

**ACTION REQUIRED:**
- [ ] Read supplier schema
- [ ] Compare with clients schema (likely similar)
- [ ] Check payment terms handling

---

#### 9. LPO (Local Purchase Orders)
**Router:** `server/routers/lpo.ts`
**Schema:** TBD
**Frontend:** LPO creation and management

**ACTION REQUIRED:**
- [ ] Read LPO schema
- [ ] Verify line items structure
- [ ] Check approval workflows

---

#### 10. DELIVERY NOTES
**Router:** `server/routers/delivery-notes.ts`
**Schema:** TBD
**Frontend:** Delivery note creation

**ACTION REQUIRED:**
- [ ] Read delivery notes schema
- [ ] Verify relationship to LPO/Purchase orders
- [ ] Check received quantities tracking

---

#### 11. GRN (Goods Receipt Notes)
**Router:** `server/routers/grn.ts`
**Schema:** TBD
**Frontend:** GRN creation

**ACTION REQUIRED:**
- [ ] Read GRN schema
- [ ] Verify relationship to PO/LPO
- [ ] Check validation of received vs ordered quantities

---

#### 12. IMPREST
**Router:** `server/routers/imprest.ts`
**Schema:** TBD
**Frontend:** Imprest creation and tracking

**ACTION REQUIRED:**
- [ ] Read imprest schema
- [ ] Verify form fields
- [ ] Check approval and settlement workflows

---

### Priority 4: Finance/Accounting

#### 13. EXPENSES
**Router:** `server/routers/expenses.ts`
**Schema:** expenseNumber, category, vendor, amount, expenseDate, paymentMethod (cash/bank_transfer/cheque/card/other), receiptUrl, description, accountId, budgetAllocationId, status (pending/approved/rejected/paid), chartOfAccountId

**ACTION REQUIRED:**
- [ ] Verify expense form includes receipt upload
- [ ] Check budget allocation link
- [ ] Verify chart of accounts integration
- [ ] Check approval workflows

---

#### 14. ESTIMATES/QUOTES
**Router:** `server/routers/estimates.ts` / `server/routers/quotes.ts`
**Schema:** estimateNumber, clientId, title, status (draft/sent/accepted/rejected/expired), issueDate, expiryDate, subtotal, taxAmount, discountAmount, total, notes, terms

**ACTION REQUIRED:**
- [ ] Verify estimate form completeness
- [ ] Check line items calculation
- [ ] Verify email/send workflows

---

#### 15. CONTRACTS
**Router:** `server/routers/contracts.ts`
**Schema:** contractName, vendor, startDate, endDate, value, status, notes
**Frontend:** ContractManagement.tsx (already checked and working)

**STATUS:** ✅ Appears complete

---

#### 16. BUDGETS
**Router:** `server/routers/budgets.ts` and `server/routers/budget.ts`
**Schema:** TBD
**Frontend:** Budget creation and management

**ACTION REQUIRED:**
- [ ] Read budget schema
- [ ] Check period/fiscal year handling
- [ ] Verify department/account allocation structure

---

#### 17. PAYMENT PLANS
**Router:** TBD
**Schema:** paymentPlans table + paymentPlanInstallments
- Frequency: weekly/biweekly/monthly/quarterly/annually
- Status: active/paused/completed/cancelled

**ACTION REQUIRED:**
- [ ] Verify payment plan creation UI
- [ ] Check installment schedule generation
- [ ] Verify payment tracking against installments

---

#### 18. CREDIT NOTES & DEBIT NOTES
**Router:** `server/routers/creditNotes.ts` / `server/routers/debitNotes.ts`
**Schema:** TBD
**Frontend:** Credit/Debit note management

**ACTION REQUIRED:**
- [ ] Read credit notes schema
- [ ] Read debit notes schema
- [ ] Verify relationship to invoices
- [ ] Check adjustment amount calculations

---

### Priority 5: CRM/Sales

#### 19. OPPORTUNITIES
**Router:** TBD
**Schema:** clientId, title, description, value, stage (lead/qualified/proposal/negotiation/closed_won/closed_lost), probability, expectedCloseDate, actualCloseDate, assignedTo, source, winReason, lossReason

**ACTION REQUIRED:**
- [ ] Verify create/edit opportunity forms
- [ ] Check stage progression workflows
- [ ] Verify assign-to user selection

---

#### 20. COMMUNICATIONS
**Router:** `server/routers/communications.ts` (if exists)
**Schema:** communicationLogs table
- Type: email/sms
- Status: pending/sent/failed

**ACTION REQUIRED:**
- [ ] Verify communication logging
- [ ] Check retry mechanisms for failed communications
- [ ] Verify audit trail

---

### Priority 6: Operations

#### 21. WORK ORDERS
**Router:** TBD
**Schema:** TBD
**Frontend:** CreateWorkOrder.tsx, EditWorkOrder.tsx (reviewed - looks complete)

**STATUS:** ✅ Appears complete

---

#### 22. SERVICE TEMPLATES
**Router:** TBD
**Schema:** TBD
**Frontend:** Service template management

**ACTION REQUIRED:**
- [ ] Verify service template schema
- [ ] Check line items structure

---

#### 23. SERVICE INVOICES
**Router:** TBD
**Schema:** TBD
**Frontend:** CreateServiceInvoice.tsx, EditServiceInvoice.tsx (reviewed - looks complete)

**STATUS:** ✅ Appears complete

---

#### 24. PROJECTS & TASKS
**Router:** `server/routers/projects.ts`
**Schema:** TBD
**Frontend:** Project management

**ACTION REQUIRED:**
- [ ] Read project and task schemas
- [ ] Verify task assignment and progress tracking

---

#### 25. TICKETS/SUPPORT
**Router:** `server/routers/tickets.ts`
**Schema:** TBD
**Frontend:** Ticket management

**ACTION REQUIRED:**
- [ ] Read ticket schema
- [ ] Check priority levels
- [ ] Verify assignment workflows

---

### Priority 7: Administration

#### 26. USERS
**Router:** `server/routers/users.ts`
**Schema:** TBD
**Frontend:** User management

**ACTION REQUIRED:**
- [ ] Verify user creation/edit forms
- [ ] Check role assignment
- [ ] Verify password management

---

#### 27. PERMISSIONS & ROLES
**Router:** `server/routers/permissions.ts`
**Schema:** rolePermissions, userPermissions tables
**Frontend:** Permission management UI

**ACTION REQUIRED:**
- [ ] Verify role creation/edit forms
- [ ] Check permission assignment UI
- [ ] Verify RBAC enforcement across all pages

---

#### 28. DEPARTMENTS
**Router:** `server/routers/departments.ts`
**Schema:** TBD
**Frontend:** Department management

**ACTION REQUIRED:**
- [ ] Read department schema
- [ ] Verify creation/edit forms

---

#### 29. ASSET MANAGEMENT
**Router:** TBD
**Schema:** TBD
**Frontend:** AssetManagement.tsx (reviewed and fixed)

**STATUS:** ✅ Hook violations fixed, working

---

#### 30. WARRANTY MANAGEMENT
**Router:** TBD
**Schema:** TBD
**Frontend:** WarrantyManagement.tsx (reviewed and fixed)

**STATUS:** ✅ Hook violations fixed, working

---

### Summary of Required Actions

**CRITICAL (Must complete):**
1. [ ] Extend Clients form with business details fields
2. [ ] Read all remaining schema definitions (payments, expenses, supplies, etc.)
3. [ ] Compare all frontend forms against their schemas
4. [ ] Identify missing form fields
5. [ ] Validate all enum/select option values match schema
6. [ ] Verify all required field validations are present

**HIGH PRIORITY:**
1. [ ] Check all approval/workflow statuses are correctly implemented
2. [ ] Verify all calculations (subtotal, tax, discounts, totals)
3. [ ] Ensure all date fields have proper formatting
4. [ ] Check pagination/limit parameters match backend
5. [ ] Verify error handling matches backend error messages

**MEDIUM PRIORITY:**
1. [ ] Review all permission checks match feature flags
2. [ ] Verify all tRPC input validation matches frontend
3. [ ] Check async/mutation error handling
4. [ ] Review all success/failure messaging

**ONGOING:**
1. [ ] Keep schema and frontend in sync as features evolve
2. [ ] Update this audit document as changes are made
3. [ ] Regular validation that all workflows function end-to-end

---

## Audit Progress

Last Updated: 2026-03-15 (Final Session)
Current Phase: Schema-to-Frontend Comparison & Initial Remediation
Completed: 
- ✅ Base router inventory (30+ entities identified)
- ✅ Created comprehensive audit framework
- ✅ Identified Clients form schema mismatches
- ✅ FIXED: EditClient.tsx extended with all missing business/banking fields
- ✅ Build verification: Exit code 0

In Progress: CreateClient.tsx same extensions
Next: Review remaining entities for schema mismatches

