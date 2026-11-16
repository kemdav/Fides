Walk-ins & Waiting List: Integrated QA Verification Checklist

Ensure your dev server is running (npm run dev). Use the direct browser URLs and source links below for end-to-end quality
assessment.  
 ──────

### 1. Navigation & Sidebar Routing

[ ] Sidebar Target on Root Pages: Go to http://localhost:3000/overview or http://localhost:3000/appointments. Click Walk-
ins in the src/components/merchant/merchant-sidebar.tsx.  
 Expected: Navigates directly to http://localhost:3000/dashboard/walk-ins without throwing a 404  
 (src/app/dashboard/walk-ins/page.tsx).  
 [ ] Active State Indicator: Open http://localhost:3000/dashboard/walk-ins or http://localhost:3000/walk-ins.  
 Expected: The "Walk-ins" tab in src/components/merchant/merchant-sidebar.tsx:40-45 is highlighted with burnt orange accent
styling (bg-[#C35000]/10 text-[#C35000]).  
 [ ] KPI Metrics Cards: Open http://localhost:3000/walk-ins (or http://localhost:3000/dashboard/walk-ins).  
 Expected: Four metric cards rendered via src/components/admin/metric-card.tsx: Waiting now, Available staff, Walk-ins  
 served today, and Typical waiting time.  
 ──────

### 2. "Add Walk-in" Modal Flows

On http://localhost:3000/walk-ins or http://localhost:3000/dashboard/walk-ins, click + Add walk-in to open  
 src/components/merchant/walk-in-modal.tsx.

[ ] Add to Waiting List:  
 1. Fill in Customer Name (e.g. Carla Gomez) and Contact Number.  
 2. Select a service and staff.  
 3. Click Add to waiting list (src/components/merchant/walk-in-modal.tsx:65-109).  
 Expected: Modal transitions to the "Added to waiting list" dialog  
 (src/components/merchant/walk-ins/confirmation-dialog.tsx) with green circular badge icon matching  
 MODALS · Dropdowns & confirmation states.png. Subtitle reads: "The customer is waiting for an available staff member  
 and resource."  
 4. Click Done or press Enter/Escape.  
 Expected: Dialog closes; customer is added to the Active Waiting Lists queue table.  
 [ ] Create Walk-in Appointment:  
 1. Click + Add walk-in again.  
 2. Fill in customer details, date, and time.  
 3. Click Create walk-in appointment (src/components/merchant/walk-in-modal.tsx:160-205).  
 Expected: Modal transitions to the "Walk-in appointment created" dialog  
 (src/components/merchant/walk-ins/confirmation-dialog.tsx). Subtitle reads: "The available slot is reserved without  
 displacing an existing booking."  
 4. Click Done.  
 Expected: Dialog closes; Walk-ins served today metric increments by 1.

──────

### 3. Queue Management & Search Filters

Test on http://localhost:3000/walk-ins or http://localhost:3000/dashboard/walk-ins in  
 src/components/merchant/walk-ins/walk-ins-view.tsx.

[ ] Search Bar: Type Mia or massage into the search box (src/components/merchant/walk-ins/walk-ins-view.tsx:320-330).  
 Expected: Queue entries filter instantaneously in real time.  
 [ ] Staff Filter Dropdown Dismissal: Click Filter to open the dropdown menu. Click anywhere outside the dropdown or press
Escape (src/components/merchant/walk-ins/walk-ins-view.tsx:140-165).  
 Expected: Dropdown dismisses immediately without persisting open.  
 [ ] Queue Row Action Menu Dismissal: Click the three dots (...) icon on any customer row  
 (src/components/merchant/walk-ins/walk-ins-view.tsx:425-445). Click anywhere outside the menu.  
 Expected: Menu closes cleanly.  
 [ ] Persisted Queue Removal: Click ... on a customer → Remove from waiting list  
 (src/components/merchant/walk-ins/walk-ins-view.tsx:185-199).  
 Expected: Customer leaves table immediately. On live dashboard (http://localhost:3000/dashboard/walk-ins), refresh the  
 browser (F5) and confirm the customer remains removed (database record set to status: 'cancelled' via  
 src/app/actions/waitlist.ts:182-219).  
 ──────

### 4. "Assign a Slot" Modal Flow

On http://localhost:3000/walk-ins, click ... on a customer row → Convert to appointment (or click Assign on a staff row)  
 to open src/components/merchant/assign-slot-modal.tsx.

[ ] Original Request Banner: Verify the gray box displays:  
 • ORIGINAL REQUEST · Position X of Y  
 • {Customer} · {Service} · {Staff} · joined {Time} matching Components.png.  
 [ ] Staff Mapping Attribution:  
 • For Mia Garcia (Any available): reads "Any available → Sofia Cruz (first available eligible staff)."  
 • For Paolo Santos (Requested staff): reads "Requested staff Lia Ramos is retained for this appointment."  
 [ ] Schedule & Time Conflict Engine:  
 • Open the Start time → End time dropdown (src/components/merchant/assign-slot-modal.tsx:72-89):  
 • Conflicting slots display: Unavailable · staff or resource conflict.  
 • Open slots display: Available · 60 minutes.  
 • Select an unavailable slot:  
 • Red banner appears: "This slot overlaps an existing booking or staff/resource availability. Choose {time} to  
 continue."  
 • The Confirm Appointment button is disabled.  
 • Select an available slot:  
 • Green/reassurance text appears: "Staff and resource are available for the full {duration} minutes. Existing  
 bookings remain protected."  
 • The Confirm Appointment button is enabled.

[ ] Queue Impact Card: Inspect the apricot box (#fdf3ec, src/components/merchant/assign-slot-modal.tsx:420-435):  
 Expected: Correctly projects next in queue (e.g. "Mia Garcia leaves the queue. Paolo Santos moves to position 1 ·  
 estimated wait 30 min").  
 [ ] Confirm Assignment: Click Confirm Appointment (src/components/merchant/assign-slot-modal.tsx:240-290).  
 Expected: Modal transitions to the "Slot assigned" dialog (src/components/merchant/walk-ins/confirmation-dialog.tsx)  
 matching MODALS · Dropdowns & confirmation states.png. Subtitle reads: "Appointment confirmed. The customer has left the  
 queue."  
 [ ] Done Action: Click Done or press Enter/Escape.  
 Expected: Dialog closes; the customer leaves the queue and Walk-ins served today increments.  
 ──────

### 5. "Available Now" Staff Table

[ ] Open http://localhost:3000/walk-ins.  
 [ ] Verify the table lists staff members, eligible service tags, assigned resource (Chair/Room), and next availability.  
 [ ] Click the Assign button next to a specific staff member (e.g. Lia Ramos,  
 src/components/merchant/walk-ins/walk-ins-view.tsx:465-480).  
 Expected: The "Assign a slot" modal opens with Lia Ramos pre-selected as the assigned specialist instead of defaulting to
the first staff member.  
 ──────

### 6. Automated Self-Check

[ ] Run the automated unit test suite from your terminal:  
 npx tsx --test scripts/test-waitlist.mjs  
 Expected: All 7 unit tests pass in scripts/test-waitlist.mjs (verifies Manila timezone formatting, waitlist creation  
 validation, cancellation params, slot assignment checks, and busy slot query guards).
