document.addEventListener('DOMContentLoaded', () => {
    // --- Data Management ---
    const STORAGE_KEY = 'anfas_gallery_images';
    let currentPage = 1;
    const itemsPerPage = 10;
    
    const defaultImages = [
        { id: 1, src: '/images/hero_wedding.png', category: 'Wedding' },
        { id: 2, src: '/images/wedding_1.png', category: 'Wedding' },
        { id: 3, src: '/images/wedding_2.png', category: 'Wedding' },
        { id: 4, src: '/images/hero_model.png', category: 'Model' },
        { id: 5, src: '/images/model_1.png', category: 'Model' },
        { id: 6, src: '/images/wedding_3.png', category: 'Wedding' }
    ];

    function getImages() {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : defaultImages;
    }

    function saveImage(image) {
        const images = getImages();
        images.unshift(image);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
        updateDashboard();
        renderGalleries();
        if (document.getElementById('manage-grid')) renderManageGallery();
        alert('Image published successfully!');
    }

    function deleteImage(id) {
        if (!confirm('Are you sure you want to delete this image?')) return;
        let images = getImages();
        images = images.filter(img => img.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
        updateDashboard();
        renderGalleries();
        renderManageGallery(document.querySelector('.filter-btn.active')?.getAttribute('data-filter') || 'All');
    }

    // --- Navigation & Header ---
    const header = document.querySelector('.header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else if (!document.body.classList.contains('subpage')) {
                header.classList.remove('scrolled');
            }
        });
    }

    // --- Admin Side Logic ---
    function updateDashboard() {
        const images = getImages();
        const total = images.length;
        const weddings = images.filter(img => img.category === 'Wedding').length;
        const models = images.filter(img => img.category === 'Model').length;

        const totalEl = document.querySelector('.stat-card:nth-child(1) .stat-value');
        const weddingEl = document.querySelector('.stat-card:nth-child(2) .stat-value');
        const modelEl = document.querySelector('.stat-card:nth-child(3) .stat-value');

        if (totalEl) totalEl.textContent = total;
        if (weddingEl) weddingEl.textContent = weddings;
        if (modelEl) modelEl.textContent = models;
    }

    const adminNavItems = document.querySelectorAll('.admin-nav-item');
    const adminViews = document.querySelectorAll('.admin-view');

    if (adminNavItems.length > 0) {
        updateDashboard();
        renderManageGallery();

        adminNavItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const viewId = item.getAttribute('data-view');
                if (!viewId) return;
                e.preventDefault();
                adminNavItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                adminViews.forEach(view => {
                    view.style.display = view.id === `admin-${viewId}` ? 'block' : 'none';
                });
                if (viewId === 'manage') {
                    currentPage = 1;
                    renderManageGallery();
                }
            });
        });

        // Filter functionality for Management
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentPage = 1;
                renderManageGallery(btn.getAttribute('data-filter'));
            });
        });

        // Upload Logic
        const publishBtn = document.querySelector('.publish-btn');
        const dropzone = document.getElementById('dropzone');
        const fileInput = document.getElementById('fileInput');
        let selectedImageData = null;

        if (dropzone && fileInput) {
            const handleFile = (file) => {
                if (!file.type.startsWith('image/')) return alert('Please select an image file.');
                const reader = new FileReader();
                reader.onload = (e) => {
                    selectedImageData = e.target.result;
                    dropzone.innerHTML = `<img src="${selectedImageData}" style="max-height: 100%; max-width: 100%; object-fit: contain;">`;
                    dropzone.style.padding = '10px';
                };
                reader.readAsDataURL(file);
            };
            dropzone.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => { if (e.target.files.length > 0) handleFile(e.target.files[0]); });
        }

        if (publishBtn) {
            publishBtn.addEventListener('click', () => {
                const categorySelect = document.getElementById('category-select');
                if (!selectedImageData) return alert('Please select an image.');
                
                const newImg = {
                    id: Date.now(),
                    src: selectedImageData,
                    category: categorySelect.value
                };
                saveImage(newImg);
                selectedImageData = null;
                dropzone.innerHTML = `<div class="dropzone-content"><i data-lucide="upload-cloud" class="upload-icon"></i><p>Drag & Drop Images or <span>Click to Upload</span></p></div>`;
                if (window.lucide) window.lucide.createIcons();
                adminNavItems[0].click(); // Back to dashboard
            });
        }
    }

    // --- Admin Manage Gallery Rendering ---
    function renderManageGallery(filter = 'All') {
        const grid = document.getElementById('manage-grid');
        const controls = document.getElementById('pagination-controls');
        if (!grid || !controls) return;
        
        let images = getImages();
        if (filter !== 'All') images = images.filter(img => img.category === filter);

        // Pagination Logic
        const totalItems = images.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = images.slice(startIndex, endIndex);

        grid.innerHTML = '';
        paginatedItems.forEach(img => {
            const item = document.createElement('div');
            item.className = 'manage-item';
            item.innerHTML = `
                <div class="manage-img-container">
                    <img src="${img.src}" alt="Gallery Image">
                    <div class="delete-overlay">
                        <button class="delete-btn" data-id="${img.id}">
                            <i data-lucide="trash-2"></i> Delete
                        </button>
                    </div>
                </div>
                <div class="manage-info">
                    <span class="manage-label">${img.category}</span>
                </div>
            `;
            grid.appendChild(item);
        });

        renderPagination(totalPages, filter);

        // Add delete event listeners
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteImage(Number(btn.getAttribute('data-id'))));
        });

        if (window.lucide) window.lucide.createIcons();
    }

    function renderPagination(totalPages, filter) {
        const controls = document.getElementById('pagination-controls');
        if (!controls) return;
        controls.innerHTML = '';

        if (totalPages <= 1) return;

        // Prev Button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn';
        prevBtn.innerHTML = '&laquo; Previous';
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = () => { currentPage--; renderManageGallery(filter); gridScrollTop(); };
        controls.appendChild(prevBtn);

        // Page Numbers
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => { currentPage = i; renderManageGallery(filter); gridScrollTop(); };
            controls.appendChild(pageBtn);
        }

        // Next Button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn';
        nextBtn.innerHTML = 'Next &raquo;';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.onclick = () => { currentPage++; renderManageGallery(filter); gridScrollTop(); };
        controls.appendChild(nextBtn);
    }

    function gridScrollTop() {
        document.querySelector('.admin-main')?.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // --- Public Gallery Rendering ---
    function renderGalleries() {
        const images = getImages();
        const weddingGrid = document.getElementById('wedding-grid');
        const homeWeddingGrid = document.querySelector('#weddings .masonry-grid');
        const modelGallery = document.getElementById('model-gallery');
        const homeModelGrid = document.querySelector('#model .masonry-grid');

        const createItem = (img, isWide = false) => {
            const div = document.createElement('div');
            div.className = `masonry-item reveal ${isWide ? 'wide' : ''}`;
            div.innerHTML = `<img src="${img.src}" alt="Gallery Image">`;
            return div;
        };

        if (weddingGrid) {
            weddingGrid.innerHTML = '';
            images.filter(img => img.category === 'Wedding').forEach((img, i) => weddingGrid.appendChild(createItem(img, i % 3 === 0)));
        }

        if (homeWeddingGrid) {
            homeWeddingGrid.innerHTML = '';
            images.filter(img => img.category === 'Wedding').slice(0, 3).forEach(img => homeWeddingGrid.appendChild(createItem(img)));
        }

        if (modelGallery) {
            modelGallery.innerHTML = '';
            images.filter(img => img.category === 'Model').forEach((img, i) => {
                const card = document.createElement('div');
                card.className = `model-card ${i === 0 ? 'active' : ''}`;
                card.innerHTML = `<img src="${img.src}" alt="Gallery Image">`;
                modelGallery.appendChild(card);
            });
            setupModelHover();
        }

        if (homeModelGrid) {
            homeModelGrid.innerHTML = '';
            images.filter(img => img.category === 'Model').slice(0, 3).forEach((img, i) => homeModelGrid.appendChild(createItem(img, i === 1)));
        }

        const revealElements = document.querySelectorAll('.reveal');
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('active'); });
        }, { threshold: 0.1 });
        revealElements.forEach(el => revealObserver.observe(el));
    }

    function setupModelHover() {
        const modelCards = document.querySelectorAll('.model-card');
        modelCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                modelCards.forEach(c => c.classList.remove('active', 'hovered'));
                card.classList.add('hovered');
            });
        });
    }

    renderGalleries();
});
