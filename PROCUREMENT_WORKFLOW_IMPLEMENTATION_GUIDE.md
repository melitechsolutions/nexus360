// Procurement Workflow Implementation Guide & Testing Scenarios

# Procurement Management System - Complete Implementation Guide

## 1. System Overview

The Procurement Management System provides end-to-end workflow management from supplier qualification to goods receipt and inventory integration.

### Core Components:

1. **Suppliers Module** - Supplier management and qualification
2. **Local Purchase Orders (LPO)** - Purchase order creation and tracking
3. **Delivery Tracking** - Real-time delivery monitoring
4. **Goods Receipt Notes (GRN)** - Receipt management with quality assessment

---

## 2. Database Schema Reference

### Suppliers Table
```sql
CREATE TABLE suppliers (
  id VARCHAR(64) PRIMARY KEY,
  supplierNumber VARCHAR(100) UNIQUE,
  companyName VARCHAR(255),
  registrationNumber VARCHAR(100),
  taxId VARCHAR(100),
  contactPerson VARCHAR(255),
  email VARCHAR(320),
  phone VARCHAR(50),
  alternatePhone VARCHAR(50),
  website VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  postalCode VARCHAR(20),
  bankName VARCHAR(255),
  bankBranch VARCHAR(255),
  accountNumber VARCHAR(100),
  accountName VARCHAR(255),
  paymentTerms VARCHAR(100),
  paymentMethods JSON,
  categories JSON,
  certifications JSON,
  qualificationStatus ENUM('pending', 'pre_qualified', 'qualified', 'rejected', 'inactive'),
  isActive BOOLEAN DEFAULT true,
  createdBy VARCHAR(64),
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### LPO (Local Purchase Order) Table
```sql
CREATE TABLE lpos (
  id VARCHAR(64) PRIMARY KEY,
  lpoNumber VARCHAR(100) UNIQUE,
  supplierId VARCHAR(64) FK,
  departmentId VARCHAR(64),
  issueDate TIMESTAMP,
  expectedDeliveryDate TIMESTAMP,
  actualDeliveryDate TIMESTAMP,
  description TEXT,
  totalAmount DECIMAL(12,2),
  taxAmount DECIMAL(12,2),
  discountAmount DECIMAL(12,2),
  netAmount DECIMAL(12,2),
  paymentTerms VARCHAR(100),
  status ENUM('draft', 'approved', 'sent', 'partial_received', 'received', 'cancelled', 'closed'),
  approvedBy VARCHAR(64),
  approvalDate TIMESTAMP,
  createdBy VARCHAR(64),
  notes TEXT,
  referenceNumber VARCHAR(100),
  deliveryAddress TEXT,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### Delivery Notes Table
```sql
CREATE TABLE deliveryNotes (
  id VARCHAR(64) PRIMARY KEY,
  deliveryNoteNumber VARCHAR(100) UNIQUE,
  lpoId VARCHAR(64) FK,
  supplierId VARCHAR(64) FK,
  deliveryDate TIMESTAMP,
  expectedDeliveryDate TIMESTAMP,
  driverId VARCHAR(255),
  vehicleNumber VARCHAR(50),
  deliveryStatus ENUM('draft', 'in_transit', 'delivered', 'partial_delivered', 'failed', 'returned'),
  receivedBy VARCHAR(255),
  receivedDate TIMESTAMP,
  condition ENUM('good', 'damaged', 'partial', 'incomplete'),
  damageNotes TEXT,
  totalItems INT,
  receivedItems INT,
  damagedItems INT,
  createdBy VARCHAR(64),
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### GRN (Goods Received Note) Table
```sql
CREATE TABLE grn (
  id VARCHAR(64) PRIMARY KEY,
  grnNumber VARCHAR(100) UNIQUE,
  lpoId VARCHAR(64) FK,
  deliveryNoteId VARCHAR(64) FK,
  supplierId VARCHAR(64) FK,
  grnDate TIMESTAMP,
  receivedDate TIMESTAMP,
  warehouseId VARCHAR(64),
  receivedBy VARCHAR(255),
  inspectedBy VARCHAR(255),
  inspectionDate TIMESTAMP,
  approvedBy VARCHAR(64),
  approvalDate TIMESTAMP,
  status ENUM('draft', 'received', 'inspected', 'approved', 'posted', 'rejected', 'partial'),
  qualityStatus ENUM('approved', 'rejected', 'partial', 'pending_inspection'),
  totalQuantity INT,
  totalCost DECIMAL(12,2),
  notes TEXT,
  rejectionReason TEXT,
  createdBy VARCHAR(64),
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

---

## 3. API Endpoints Reference

### Suppliers Router (`/server/routers/suppliers.ts`)
- `suppliers.list` - Get suppliers with filters (status, search)
- `suppliers.getById` - Get supplier details
- `suppliers.create` - Create new supplier
- `suppliers.update` - Update supplier information
- `suppliers.delete` - Delete supplier
- `suppliers.rate` - Add supplier rating
- `suppliers.audit` - Get supplier audit history

### LPO Router (`/server/routers/lpo.ts`)
- `lpo.list` - Get all LPOs
- `lpo.getById` - Get specific LPO
- `lpo.create` - Create new LPO
- `lpo.update` - Update LPO (status changes, amounts)
- `lpo.delete`- Delete LPO (admin only)
- `lpo.approve` - Approve LPO (requires permission)
- `lpo.addLineItems` - Add products to LPO

### Delivery Notes Router (`/server/routers/delivery-notes.ts`)
- `deliveryNotes.list` - Get delivery notes
- `deliveryNotes.getById` - Get specific delivery note
- `deliveryNotes.create` - Create new delivery note
- `deliveryNotes.update` - Update delivery status
- `deliveryNotes.delete` - Delete delivery note

### GRN Router (`/server/routers/grn.ts`)
- `grn.list` - Get all GRNs
- `grn.getById` - Get specific GRN
- `grn.create` - Create new GRN
- `grn.update` - Update GRN status
- `grn.delete` - Delete GRN
- `grn.assessQuality` - Record quality assessment

---

## 4. Frontend Pages

### New Pages Created:

1. **ProcurementManagement.tsx** (`/procurement/management`)
   - Workflow visualization
   - Key metrics dashboard
   - Tabbed interface for LPO, Deliveries, GRN
   - Quick reference guide

2. **DeliveryTracking.tsx** (`/procurement/deliveries`)
   - Real-time delivery status monitoring
   - Delivery metrics and KPIs
   - Traceback to supplier
   - Delivery timeline visualization

3. **GRNManagement.tsx** (`/procurement/grn`)
   - Goods receipt management
   - Quality assessment interface
   - Warehouse intake tracking
   - Receipt workflow guide

### Existing Pages Enhanced:

1. **Suppliers.tsx** - Full supplier management
2. **CreateSupplier.tsx** - New supplier form
3. **LPOs.tsx** - Enhanced LPO list view
4. **CreateLPO.tsx** - Purchase order creation

---

## 5. End-to-End Workflow Example

### Step 1: Supplier Selection & Qualification
```
1. Navigate to Suppliers page (/suppliers)
2. Click "New Supplier" button
3. Enter supplier details:
   - Company Name
   - Contact Person & Email
   - Phone & Address
   - Banking Information
   - Payment Terms
4. Set initial qualification status to "pending"
5. Click "Create Supplier"
6. System assigns unique supplier number (SUP-0001)
```

### Step 2: Create Purchase Order (LPO)
```
1. Navigate to Procurement Management (/procurement/management)
2. Go to "Purchase Orders" tab
3. Click "New LPO" button
4. Fill in order details:
   - Supplier ID (select from dropdown)
   - Description of items
   - Total Amount
   - Expected Delivery Date (optional)
5. Click "Create LPO"
6. System assigns unique LPO number (LPO-000001)
7. Status: "draft"
```

### Step 3: Approve & Send LPO
```
1. From LPO list, click on order
2. Review order details
3. Click "Approve" (requires procurement:lpo:approve permission)
4. System updates status: "approved"
5. Click "Send to Supplier"
6. Status updates to: "sent"
7. Supplier receives notification
```

### Step 4: Track Delivery
```
1. Navigate to Delivery Tracking (/procurement/deliveries)
2. When delivery arrives, click "New Delivery"
3. Enter delivery details:
   - Delivery Note Number
   - Supplier Name
   - Expected Delivery Date
   - Number of Items
   - Any delivery notes
4. Click "Create Delivery Note"
5. System automatically links to LPO (if available)
6. Status: "draft"
```

### Step 5: Update Delivery Status
```
1. From Delivery list, view the delivery
2. As delivery progresses, update status:
   - "in_transit" - goods on the way
   - "delivered" - goods received
   - "partial_delivered" - some items only
   - "failed" - delivery issue
3. Record actual delivery date
4. Note any damage or discrepancies
```

### Step 6: Create Goods Receipt Note (GRN)
```
1. Navigate to GRN Management (/procurement/grn)
2. Click "New GRN" button
3. Enter receipt details:
   - GRN Number
   - Supplier Name
   - Invoice Number
   - Received Date
   - Number of Items
   - Total Value
   - Any notes
4. Click "Create GRN"
```

### Step 7: Quality Assessment
```
1. From GRN list, click "View"
2. Scroll to "Quality Assessment" section
3. Select inspection result:
   - "Accepted" - goods meet specs
   - "Partial Acceptance" - some items ok
   - "Damaged" - visible damage
   - "Defective" - quality issues
4. Enter assessment remarks
5. Click "Submit Assessment"
6. System stores quality record
```

### Step 8: Load to Inventory
```
1. After quality approval, click "Load to Inventory"
2. System updates inventory levels
3. Records are linked to warehouse locations
4. GRN status: "posted"
5. Goods are now available for allocation
```

---

## 6. Testing Scenarios

### Scenario 1: Complete Successful Procurement
**Expected Outcome**: Order → Delivery → Receipt successfully completed
```
1. Create supplier "ABC Supplies Ltd"
2. Create LPO for 100 units @ 50/unit = 5,000
3. Approve LPO
4. Create delivery note DN-001
5. Update delivery to "in_transit" then "delivered"
6. Create GRN-001 for 100 units
7. Pass quality assessment
8. Load to inventory
✓ All statuses should flow through correctly
✓ GRN should be "approved" status
✓ Inventory should be updated
```

### Scenario 2: Partial Delivery
**Expected Outcome**: Handle split deliveries correctly
```
1. Create LPO for 100 units
2. Receivedelivery note for 60 units (partial)
3. Set delivery status to "partially_delivered"
4. Create GRN-001 for 60 units
5. Create 2nd delivery note for remaining 40 units
6. Create 2nd GRN for 40 units
✓ Both GRNs should link to same LPO
✓ Totals should sum to 100 units
✓ Invoice cross-check should pass
```

### Scenario 3: Quality Rejection
**Expected Outcome**: Handle rejected goods workflow
```
1. Create LPO and receive goods
2. Create GRN
3. During quality assessment, select "Rejected"
4. Enter rejection reason: "Damaged packaging"
5. System should flag for Return Merchandise Authorization (RMA)
6. Create return shipment
7. Update supplier performance metrics
✓ GRN status: "rejected"
✓ Inventory NOT loaded
✓ Supplier rating updated
✓ Alert generated for follow-up
```

### Scenario 4: Permissions & Access Control
**Expected Outcome**: Role-based access enforced
```
1. Procurement Officer: Can create/view LPO
2. Finance Officer: Can approve LPO
3. Warehouse Officer: Can create GRN & assess quality
4. Supplier: Can view their own orders
Test each role's access and restrictions
✓ Unauthorized access should be blocked
✓ Appropriate features available to each role
```

---

## 7. Database Connection Setup

### For Development:
```bash
# .env configuration
DATABASE_URL=mysql://melitech_user:password@localhost:3306/melitech_crm

# Run migrations locally
npm run db:push
```

### For Docker:
```bash
# Docker environment
DATABASE_URL=mysql://melitech_user:password@db:3306/melitech_crm

# Migrations run automatically at startup
```

---

## 8. Performance Optimization Tips

### Indexes Created:
- `supplier_code_idx` on suppliers.supplierCode
- `status_idx` on lpos.status
- `issue_date_idx` on lpos.issueDate
- `delivery_note_number_idx` on deliveryNotes.deliveryNoteNumber
- `grn_number_idx` on grn.grnNumber
- `quality_status_idx` on grn.qualityStatus

### Query Optimization:
- Use paging for supplier lists (limit 50)
- Filter deliveries by status before retrieval
- Cache supplier list for dropdown selects
- Index searches on companyName, email

---

## 9. Integration Points

### With Other Modules:
1. **Inventory Module**: Load GRN to update stock levels
2. **Payments Module**: Link payments to LPO invoice
3. **Finance Module**: Create journal entries for procurement
4. **HR Module**: Assign purchase approvers by department
5. **Reports Module**: Generate procurement analytics

---

## 10. Key Business Rules

1. **LPO Amount Validation**: Total amount cannot exceed department budget
2. **Supplier Qualification**: Only "qualified" suppliers can receive orders (optional rule)
3. **Delivery Matching**: Delivery items should match LPO items
4. **GRN Variance**: Received quantity variance % tolerance (default 5%)
5. **Payment Terms**: No payment until GRN approval (if configured)
6. **Three-way Match**: PO amount ≈ Invoice amount ≈ GRN amount

---

## 11. Troubleshooting Guide

### Issue: "Database not available"
- Check DATABASE_URL environment variable
- Verify MySQL service is running
- Check database credentials

### Issue: "Supplier dropdown empty"
- Run: `npm run db:push` to execute migrations
- Verify suppliers exist in database
- Check permissions on suppliers.list endpoint

### Issue: "Permission denied on LPO approve"
- User needs "procurement:lpo:approve" permission
- Check user role/permissions in database
- Contact admin to grant permission

### Issue: "GRN not linking to LPO"
- Verify LPO exists and is in"approved" status
- Check supplier ID matches
- Ensure delivery date is after LPO date

---

## 12. Next Steps & Enhancements

### Phase 2 (Future):
1. Automated supplier rating calculation
2. RFQ (Request for Quotation) workflow
3. Contract management integration
4. Payment reconciliation automation
5. Mobile app for warehouse staff
6. Integration with shipping APIs
7. Blockchain verification for high-value orders
8. Supplier portal for order visibility

### Phase 3:
1. AI-powered demand forecasting
2. Automated reorder point calculations
3. Supplier network analysis
4. Multi-location inventory balancing
5. Predictive delivery analytics

---

## 13. Support & Contact

For issues or feature requests:
1. Check database connection first
2. Review server logs for errors
3. Test endpoints using Postman
4. Contact development team with error details
5. Include user role and permissions in bug report

---

**Document Version**: 1.0
**Last Updated**: March 16, 2026
**Status**: Production Ready
