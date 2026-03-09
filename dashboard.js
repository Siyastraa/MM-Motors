// ===== DASHBOARD LOGIC =====

// Check auth
document.addEventListener('DOMContentLoaded', () => {
    const session = JSON.parse(localStorage.getItem('mm_session') || '{}');
    if (!session.loggedIn || !session.isStaff) {
        window.location.href = 'login.html?role=staff';
        return;
    }
    document.getElementById('staffName').textContent = `Welcome, ${session.name || session.id || 'Staff'}`;
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    fetchAndRenderInvoices();
    loadDashboard();
    renderCarsTable();
    renderBookingsTable();
    populateCarSelects();
});

// ===== DATA HELPERS =====
function getCars() { return JSON.parse(localStorage.getItem('mm_cars') || '[]'); }
function saveCars(cars) { localStorage.setItem('mm_cars', JSON.stringify(cars)); }

function getBookings() { return JSON.parse(localStorage.getItem('mm_bookings') || '[]'); }
function saveBookings(bookings) { localStorage.setItem('mm_bookings', JSON.stringify(bookings)); }

let globalInvoices = [];
function getInvoices() { return globalInvoices; }

async function fetchAndRenderInvoices() {
    try {
        const res = await fetch('/api/invoices');
        if (res.ok) {
            globalInvoices = await res.json();
            renderInvoicesTable();
            loadDashboard();
        }
    } catch (e) {
        console.error('Error fetching invoices from DB:', e);
    }
}

function generateId(prefix) { return prefix + '-' + Date.now().toString(36).toUpperCase(); }

// ===== PANEL NAVIGATION =====
function showPanel(name) {
    document.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    document.getElementById('panel-' + name).classList.add('active');
    document.querySelector(`[data-panel="${name}"]`).classList.add('active');
    if (name === 'cars') renderCarsTable();
    if (name === 'bookings') { renderBookingsTable(); populateCarSelects(); }
    if (name === 'invoices') { renderInvoicesTable(); populateCarSelects(); }
    if (name === 'overview') loadDashboard();
}

// ===== MODAL =====
function openModal(name) {
    document.getElementById('modal-' + name).classList.add('active');
    if (name === 'addBooking') populateCarSelects();
    if (name === 'addInvoice') {
        const invNum = document.getElementById('invNumber');
        if (invNum) invNum.value = generateId('INV');
        
        const invDate = document.getElementById('invDate');
        if (invDate) invDate.value = new Date().toISOString().split('T')[0];
        
        const dueDate = document.getElementById('invDueDate');
        if (dueDate) {
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            dueDate.value = nextWeek.toISOString().split('T')[0];
        }

        const container = document.getElementById('invoiceItemsContainer');
        if (container) {
            container.innerHTML = '';
            addInvoiceItem();
            calculateInvoiceTotals();
        }
    }
}

function closeModal(name) {
    document.getElementById('modal-' + name).classList.remove('active');
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
    });
});

// ===== DASHBOARD OVERVIEW =====
function loadDashboard() {
    const cars = getCars();
    const bookings = getBookings();
    const invoices = getInvoices();

    document.getElementById('statCars').textContent = cars.length;
    document.getElementById('statBookings').textContent = bookings.length;
    document.getElementById('statInvoices').textContent = invoices.length;
    document.getElementById('statAvailable').textContent = cars.filter(c => c.status === 'available').length;

    // Recent activity
    const activities = [
        ...cars.map(c => ({ type: 'car', text: `Car added: ${c.make} ${c.model}`, time: c.createdAt })),
        ...bookings.map(b => ({ type: 'booking', text: `Booking: ${b.customer} - ${b.carName}`, time: b.createdAt })),
        ...invoices.map(i => ({ type: 'invoice', text: `Invoice ${i.id}: R${parseFloat(i.amount).toLocaleString()} for ${i.customer}`, time: i.createdAt }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);

    const actDiv = document.getElementById('recentActivity');
    if (activities.length === 0) {
        actDiv.innerHTML = '<div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg><h3>Welcome to the Dashboard</h3><p>Start by adding cars to the system using Car Management.</p></div>';
    } else {
        actDiv.innerHTML = '<table class="data-table"><thead><tr><th>Type</th><th>Activity</th><th>Date</th></tr></thead><tbody>' +
            activities.map(a => `<tr><td><span class="table-badge badge-${a.type === 'car' ? 'available' : a.type === 'booking' ? 'booked' : 'paid'}">${a.type}</span></td><td>${a.text}</td><td>${new Date(a.time).toLocaleDateString('en-ZA')}</td></tr>`).join('') +
            '</tbody></table>';
    }
}

// ===== CAR MANAGEMENT =====
function renderCarsTable() {
    const cars = getCars();
    const tbody = document.getElementById('carsTableBody');
    if (cars.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><h3>No cars in the system</h3><p>Click "+ Add Car" to register a vehicle.</p></div></td></tr>';
        return;
    }
    tbody.innerHTML = cars.map(car => `
        <tr>
            <td style="font-weight:600; color:var(--text-primary);">${car.id}</td>
            <td><strong>${car.make} ${car.model}</strong></td>
            <td>${car.year}</td>
            <td>${car.colour}</td>
            <td style="font-size:0.78rem;">${car.vin || '—'}</td>
            <td><span class="table-badge badge-${car.status}">${car.status}</span></td>
            <td>
                <div class="table-actions">
                    <button onclick="editCarStatus('${car.id}')">Status</button>
                    <button class="btn-delete" onclick="deleteCar('${car.id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

document.getElementById('addCarForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const cars = getCars();
    const car = {
        id: generateId('CAR'),
        make: document.getElementById('carMake').value,
        model: document.getElementById('carModel').value,
        year: document.getElementById('carYear').value,
        colour: document.getElementById('carColour').value,
        vin: document.getElementById('carVin').value,
        mileage: document.getElementById('carMileage').value,
        price: document.getElementById('carPrice').value || 'POA',
        status: document.getElementById('carStatus').value,
        notes: document.getElementById('carNotes').value,
        createdAt: new Date().toISOString()
    };
    cars.push(car);
    saveCars(cars);
    closeModal('addCar');
    e.target.reset();
    renderCarsTable();
    loadDashboard();
});

function editCarStatus(id) {
    const cars = getCars();
    const car = cars.find(c => c.id === id);
    if (!car) return;
    const newStatus = prompt(`Change status for ${car.make} ${car.model}\nCurrent: ${car.status}\n\nOptions: available, booked, sold`, car.status);
    if (newStatus && ['available', 'booked', 'sold'].includes(newStatus.toLowerCase())) {
        car.status = newStatus.toLowerCase();
        saveCars(cars);
        renderCarsTable();
        loadDashboard();
    }
}

function deleteCar(id) {
    if (!confirm('Are you sure you want to delete this car?')) return;
    const cars = getCars().filter(c => c.id !== id);
    saveCars(cars);
    renderCarsTable();
    loadDashboard();
}

// ===== BOOKINGS & INVOICE CACHING =====
function populateCarSelects() {
    const cars = getCars();
    const options = '<option value="">Choose a car...</option>' + cars.map(c => `<option value="${c.id}">${c.make} ${c.model} (${c.year}) - ${c.status}</option>`).join('');
    const bookSelect = document.getElementById('bookCar');
    if (bookSelect) bookSelect.innerHTML = options;
    
    // For invoices, provide a massive list of global manufacturers
    const manufacturers = [
        "Toyota", "Volkswagen (VW)", "Ford", "Nissan", "Hyundai", "Kia", "BMW", "Mercedes-Benz", "Audi", "Renault",
        "Suzuki", "Honda", "Mazda", "Isuzu", "Chevrolet", "Haval", "Chery", "Volvo", "Land Rover", "Jeep",
        "Peugeot", "Subaru", "Lexus", "Porsche", "Mahindra", "Tata", "Fiat", "Mitsubishi"
    ];
    
    const invSelect = document.getElementById('invVehicleMake');
    if (invSelect) {
        invSelect.innerHTML = '<option value="">None / Custom</option>' + manufacturers.map(m => `<option value="${m}">${m}</option>`).join('');
    }
}

function toggleCustomDescription() {
    const select = document.getElementById('invDescriptionSelect');
    const customInput = document.getElementById('invDescriptionCustom');
    if (select && customInput) {
        if (select.value === 'Custom') {
            customInput.style.display = 'block';
            customInput.setAttribute('required', 'true');
        } else {
            customInput.style.display = 'none';
            customInput.removeAttribute('required');
        }
    }
}

function renderBookingsTable() {
    const bookings = getBookings();
    const tbody = document.getElementById('bookingsTableBody');
    if (bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><h3>No bookings yet</h3><p>Click "+ New Booking" to create one.</p></div></td></tr>';
        return;
    }
    tbody.innerHTML = bookings.map(b => `
        <tr>
            <td style="font-weight:600; color:var(--text-primary);">${b.id}</td>
            <td><strong>${b.customer}</strong><br><span style="font-size:0.75rem;color:var(--text-muted);">${b.phone}</span></td>
            <td>${b.carName}</td>
            <td>${new Date(b.date).toLocaleDateString('en-ZA')}</td>
            <td><span class="table-badge badge-booked">${b.type}</span></td>
            <td>
                <div class="table-actions">
                    <button onclick="generateInvoiceFromBooking('${b.id}')">Invoice</button>
                    <button class="btn-delete" onclick="deleteBooking('${b.id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

document.getElementById('addBookingForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const bookings = getBookings();
    const cars = getCars();
    const carId = document.getElementById('bookCar').value;
    const car = cars.find(c => c.id === carId);
    
    const booking = {
        id: generateId('BK'),
        customer: document.getElementById('bookCustomer').value,
        phone: document.getElementById('bookPhone').value,
        email: document.getElementById('bookEmail').value,
        carId: carId,
        carName: car ? `${car.make} ${car.model}` : 'Unknown',
        date: document.getElementById('bookDate').value,
        type: document.getElementById('bookType').value,
        notes: document.getElementById('bookNotes').value,
        createdAt: new Date().toISOString()
    };

    // Update car status to booked
    if (car && car.status === 'available') {
        car.status = 'booked';
        saveCars(cars);
    }

    bookings.push(booking);
    saveBookings(bookings);
    closeModal('addBooking');
    e.target.reset();
    renderBookingsTable();
    renderCarsTable();
    loadDashboard();
});

function deleteBooking(id) {
    if (!confirm('Delete this booking?')) return;
    const bookings = getBookings().filter(b => b.id !== id);
    saveBookings(bookings);
    renderBookingsTable();
    loadDashboard();
}

function generateInvoiceFromBooking(bookingId) {
    const bookings = getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    showPanel('invoices');
    setTimeout(() => {
        openModal('addInvoice');
        document.getElementById('invCustomer').value = booking.customer;
        document.getElementById('invEmail').value = booking.email || '';
        document.getElementById('invPhone').value = booking.phone || '';
        if (booking.carName) {
            const parts = booking.carName.split(' ');
            document.getElementById('invVehicleMake').value = parts[0] || '';
            document.getElementById('invVehicleModel').value = parts.slice(1).join(' ') || '';
        } else {
            document.getElementById('invVehicleMake').value = '';
            document.getElementById('invVehicleModel').value = '';
        }
        
        const firstRow = document.querySelector('.dynamic-item-row');
        if (firstRow) {
            firstRow.querySelector('.item-desc').value = `${booking.type} - ${booking.carName}`;
        }
    }, 200);
}

// ===== INVOICE DYNAMIC ITEMS =====
function addInvoiceItem() {
    const container = document.getElementById('invoiceItemsContainer');
    const rowId = 'item-' + Date.now();
    const html = `
        <div class="dynamic-item-row" id="${rowId}">
            <div class="form-group" style="margin:0;"><input type="text" class="item-desc" list="car-parts-list" placeholder="Service or Part" required></div>
            <div class="form-group" style="margin:0;"><input type="number" class="item-qty" value="1" min="1" oninput="calculateInvoiceTotals()" required></div>
            <div class="form-group" style="margin:0;"><input type="number" class="item-price" placeholder="0.00" step="0.01" oninput="calculateInvoiceTotals()" required></div>
            <div class="form-group" style="margin:0;"><input type="text" class="item-total" value="R0.00" readonly style="background: rgba(255,255,255,0.05); color: #fff;"></div>
            <button type="button" class="btn-remove" onclick="removeInvoiceItem('${rowId}')" title="Remove Item">&times;</button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}

function removeInvoiceItem(rowId) {
    const row = document.getElementById(rowId);
    if (row && document.querySelectorAll('.dynamic-item-row').length > 1) {
        row.remove();
        calculateInvoiceTotals();
    } else {
        alert("An invoice must have at least one item.");
    }
}

function calculateInvoiceTotals() {
    const rows = document.querySelectorAll('.dynamic-item-row');
    let subtotal = 0;
    
    rows.forEach(row => {
        const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const total = qty * price;
        row.querySelector('.item-total').value = 'R' + total.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        subtotal += total;
    });

    const vat = subtotal * 0.15;
    const grandTotal = subtotal + vat;

    const dispSub = document.getElementById('invDisplaySubtotal');
    if(dispSub) dispSub.textContent = 'R' + subtotal.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const dispVat = document.getElementById('invDisplayVat');
    if(dispVat) dispVat.textContent = 'R' + vat.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const dispTotal = document.getElementById('invDisplayTotal');
    if(dispTotal) dispTotal.textContent = 'R' + grandTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const calcSub = document.getElementById('invCalculatedSubtotal');
    if(calcSub) calcSub.value = subtotal;
    
    const calcVat = document.getElementById('invCalculatedVat');
    if(calcVat) calcVat.value = vat;
    
    const calcTotal = document.getElementById('invCalculatedTotal');
    if(calcTotal) calcTotal.value = grandTotal;
}

// ===== INVOICES =====
function renderInvoicesTable() {
    const invoices = getInvoices();
    const tbody = document.getElementById('invoicesTableBody');
    if (invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><h3>No invoices yet</h3><p>Click "+ Generate Invoice" to create one.</p></div></td></tr>';
        return;
    }
    tbody.innerHTML = invoices.map(inv => `
        <tr>
            <td style="font-weight:600; color:var(--text-primary);">${inv.id}</td>
            <td><strong>${inv.customer}</strong></td>
            <td>${(inv.items && inv.items.length > 0) ? inv.items.length + ' Item(s)' : 'Custom Invoice'}</td>
            <td style="font-weight:700; color:var(--accent);">R${parseFloat(inv.amount).toLocaleString('en-ZA', {minimumFractionDigits: 2})}</td>
            <td><span class="table-badge badge-${inv.status}">${inv.status}</span></td>
            <td>
                <div class="table-actions">
                    <button onclick="previewInvoice('${inv.id}')">View</button>
                    <button onclick="toggleInvoiceStatus('${inv.id}')">${inv.status === 'pending' ? 'Mark Paid' : 'Mark Pending'}</button>
                    <button class="btn-delete" onclick="deleteInvoice('${inv.id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

document.getElementById('addInvoiceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const invoices = getInvoices();

    // Extract line items
    const items = [];
    document.querySelectorAll('.dynamic-item-row').forEach(row => {
        items.push({
            description: row.querySelector('.item-desc').value,
            quantity: parseFloat(row.querySelector('.item-qty').value) || 0,
            unitPrice: parseFloat(row.querySelector('.item-price').value) || 0,
            total: (parseFloat(row.querySelector('.item-qty').value) || 0) * (parseFloat(row.querySelector('.item-price').value) || 0)
        });
    });

    const invoice = {
        id: document.getElementById('invNumber').value,
        date: document.getElementById('invDate').value,
        dueDate: document.getElementById('invDueDate').value,
        customer: document.getElementById('invCustomer').value,
        email: document.getElementById('invEmail').value,
        phone: document.getElementById('invPhone').value,
        address: document.getElementById('invAddress').value,
        
        vehicleMake: document.getElementById('invVehicleMake').value,
        vehicleModel: document.getElementById('invVehicleModel').value,
        vehicleYear: document.getElementById('invVehicleYear').value,
        vehiclePlate: document.getElementById('invVehiclePlate').value,
        vehicleVin: document.getElementById('invVehicleVin').value,
        vehicleMileage: document.getElementById('invVehicleMileage').value,
        
        items: items,
        subtotal: document.getElementById('invCalculatedSubtotal').value,
        vat: document.getElementById('invCalculatedVat').value,
        amount: document.getElementById('invCalculatedTotal').value, // Used for the list view grand total amount
        status: document.getElementById('invStatus').value,
        notes: document.getElementById('invNotes').value,
        createdAt: new Date().toISOString()
    };

    try {
        const res = await fetch('/api/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invoice)
        });
        if (res.ok) {
            closeModal('addInvoice');
            e.target.reset();
            fetchAndRenderInvoices();
        } else {
            alert('Failed to save invoice to the database.');
        }
    } catch(err) {
        console.error('Server error:', err);
        alert('Server connection error.');
    }
});

async function toggleInvoiceStatus(id) {
    const invoices = getInvoices();
    const inv = invoices.find(i => i.id === id);
    if (!inv) return;
    
    const newStatus = inv.status === 'pending' ? 'paid' : 'pending';
    try {
        const res = await fetch(`/api/invoices/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) fetchAndRenderInvoices();
    } catch(e) {
        console.error('Failed to toggle status:', e);
    }
}

async function deleteInvoice(id) {
    if (!confirm('Delete this invoice?')) return;
    try {
        const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
        if (res.ok) fetchAndRenderInvoices();
    } catch(e) {
        console.error('Failed to delete invoice:', e);
    }
}

// ===== INVOICE PREVIEW =====
function previewInvoice(id) {
    const invoices = getInvoices();
    const inv = invoices.find(i => i.id === id);
    if (!inv) return;

    const date = new Date(inv.createdAt);
    
    // Convert logo path to an absolute path for printing context
    const logoUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/images/logo.png');

    const html = `
        <div class="invoice-header">
            <div>
                <img src="${logoUrl}" alt="MM Motors Logo" style="height: 48px; margin-bottom: 12px; display: block;">
                <div class="company-name">MM Motors</div>
                <div class="company-details">
                    Location to be communicated<br>
                    VAT No: 4123456789<br>
                    +27 (011) 492 3400<br>
                    info@mmmotors.co.za
                </div>
            </div>
            <div style="text-align:right;">
                <div style="font-size:1.6rem; font-weight:800; color:#111;">TAX INVOICE</div>
                <div style="font-size:0.85rem; color:#666;">${inv.id}</div>
                <div style="font-size:0.82rem; color:#999; margin-top:8px;">
                    Invoice Date: ${date.toLocaleDateString('en-ZA')}<br>
                    Due Date: ${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-ZA') : 'Upon Receipt'}<br>
                    Status: <strong style="color:${inv.status === 'paid' ? '#22c55e' : '#eab308'}">${inv.status.toUpperCase()}</strong>
                </div>
            </div>
        </div>

        <div class="invoice-info">
            <div>
                <h4>Bill To</h4>
                <p>
                    <strong>${inv.customer}</strong><br>
                    ${inv.phone ? inv.phone + '<br>' : ''}
                    ${inv.email ? inv.email + '<br>' : ''}
                    ${inv.address ? inv.address.replace(/\n/g, '<br>') : ''}
                </p>
            </div>
            <div>
                <h4>Vehicle Information</h4>
                <p style="text-transform: capitalize;">
                    <strong>Make/Model:</strong> ${inv.vehicleMake || 'N/A'} ${inv.vehicleModel || ''} ${inv.vehicleYear ? `(${inv.vehicleYear})` : ''}<br>
                    ${inv.vehiclePlate ? `<strong>Plate:</strong> <span style="text-transform: uppercase;">${inv.vehiclePlate}</span><br>` : ''}
                    ${inv.vehicleVin ? `<strong>VIN:</strong> <span style="text-transform: uppercase;">${inv.vehicleVin}</span><br>` : ''}
                    ${inv.vehicleMileage ? `<strong>Mileage:</strong> ${inv.vehicleMileage.toLocaleString()} km` : ''}
                </p>
            </div>
        </div>

        <table class="invoice-table">
            <thead>
                <tr>
                    <th style="width: 50%;">Description</th>
                    <th style="text-align:center;">Qty</th>
                    <th style="text-align:right;">Unit Price</th>
                    <th style="text-align:right;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${(inv.items && inv.items.length > 0) ? inv.items.map(item => `
                    <tr>
                        <td style="text-transform: capitalize;"><strong>${item.description}</strong></td>
                        <td style="text-align:center;">${item.quantity}</td>
                        <td style="text-align:right;">R${parseFloat(item.unitPrice).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                        <td style="text-align:right; font-weight:600;">R${parseFloat(item.total).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                    </tr>
                `).join('') : `
                    <tr>
                        <td colspan="4" style="text-align:center; color:#999;">No items detailed. Legacy Invoice.</td>
                    </tr>
                `}
                
                <!-- Totals -->
                <tr>
                    <td colspan="2" style="border:none;"></td>
                    <td style="text-align:right; border-bottom:1px solid #eee; padding-top: 24px;">Subtotal:</td>
                    <td style="text-align:right; font-weight:600; border-bottom:1px solid #eee; padding-top: 24px;">${inv.subtotal ? 'R' + parseFloat(inv.subtotal).toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}</td>
                </tr>
                <tr>
                    <td colspan="2" style="border:none;"></td>
                    <td style="text-align:right; border-bottom:1px solid #eee;">VAT (15%):</td>
                    <td style="text-align:right; font-weight:600; border-bottom:1px solid #eee;">${inv.vat ? 'R' + parseFloat(inv.vat).toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}</td>
                </tr>
                <tr>
                    <td colspan="2" style="border:none;"></td>
                    <td style="text-align:right; font-size:1.1rem; font-weight:800; border-bottom:2px solid #000; padding:16px 12px;">Grand Total:</td>
                    <td style="text-align:right; font-size:1.1rem; font-weight:800; border-bottom:2px solid #000; padding:16px 12px;">R${parseFloat(inv.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                </tr>
                
                ${inv.notes ? `<tr><td colspan="4" style="font-size:0.8rem; color:#999; font-style:italic; padding-top:24px;">Note: ${inv.notes}</td></tr>` : ''}
            </tbody>
        </table>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee;">
            <div style="font-size: 0.8rem; color: #555;">
                <h4 style="margin: 0 0 8px; font-size: 0.72rem; color: #999; text-transform: uppercase; letter-spacing: 1px;">Banking Details</h4>
                <strong>Bank Name:</strong> First National Bank (FNB)<br>
                <strong>Account Name:</strong> MM Motors (Pty) Ltd<br>
                <strong>Account Number:</strong> 620011223344<br>
                <strong>Branch Code:</strong> 250655<br>
                <strong>Reference:</strong> ${inv.id}
            </div>
            <div style="font-size:0.75rem; color:#999; text-align:right; display: flex; align-items: flex-end; justify-content: flex-end;">
                Thank you for choosing MM Motors.
            </div>
        </div>
    `;

    document.getElementById('invoicePreviewContent').innerHTML = html;
    openModal('invoicePreview');
}

function printInvoice() {
    const btn = document.querySelector('.btn-primary[onclick="printInvoice()"]');
    const originalText = btn.innerHTML;
    if (btn) {
        btn.innerHTML = 'Generating PDF...';
        btn.disabled = true;
    }

    const content = document.getElementById('invoicePreviewContent').innerHTML;
    
    // Create a temporary container for rendering
    const container = document.createElement('div');
    container.style.width = '800px'; // Fixed width for consistent rendering
    container.style.padding = '40px';
    container.style.background = '#ffffff';
    container.style.color = '#111111';
    container.style.fontFamily = "'Inter', sans-serif";
    container.innerHTML = content;

    // Inject styles for the PDF
    const style = document.createElement('style');
    style.innerHTML = `
        * { color: #111 !important; }
        .invoice-header { display: flex; justify-content: space-between; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #000; }
        .company-name { font-family: 'Outfit', sans-serif; font-size: 1.4rem; font-weight: 800; color: #000 !important; letter-spacing: 1px; }
        .company-details { font-size: 0.78rem; color: #444 !important; line-height: 1.6; }
        .invoice-info { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
        .invoice-info h4 { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 1px; color: #666 !important; margin: 0 0 6px; }
        .invoice-info p { font-size: 0.88rem; color: #222 !important; line-height: 1.6; margin: 0; }
        .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        .invoice-table th { padding: 10px 12px; background: #f5f5f5 !important; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #444 !important; text-align: left; }
        .invoice-table td { padding: 12px; font-size: 0.88rem; color: #111 !important; }
        .invoice-table tbody tr td { border-bottom: 1px solid #eee !important; }
        .invoice-table td[colspan="2"] { border: none !important; }
    `;
    container.appendChild(style);

    // Get Invoice ID for filename
    const invoiceIdMatch = content.match(/INV-\w+/);
    const filename = invoiceIdMatch ? `${invoiceIdMatch[0]}.pdf` : 'MM_Motors_Invoice.pdf';

    const opt = {
        margin:       [10, 0, 10, 0], // mm
        filename:     filename,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(container).set(opt).save().then(() => {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }).catch(err => {
        console.error("PDF generation failed", err);
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
        alert("Failed to generate PDF. Please try again.");
    });
}
