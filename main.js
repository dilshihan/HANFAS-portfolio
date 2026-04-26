import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- Data Management ---
    let currentPage = 1;
    const itemsPerPage = 10;
    let cachedImages = [];
    
    const defaultImages = [
        { id: 'd1', url: '/images/hero_wedding.png', category: 'Wedding' },
        { id: 'd2', url: '/images/wedding_1.png', category: 'Wedding' },
        { id: 'd3', url: '/images/wedding_2.png', category: 'Wedding' },
        { id: 'd4', url: '/images/hero_model.png', category: 'Model' },
        { id: 'd5', url: '/images/model_1.png', category: 'Model' },
        { id: 'd6', url: '/images/wedding_3.png', category: 'Wedding' }
    ];

    async function getImages() {
        try {
            const { data, error } = await supabase
                .from('images')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            cachedImages = data && data.length > 0 ? data : defaultImages;
            return cachedImages;
        } catch (e) {
            console.error('Fetch Error:', e);
            return defaultImages;
        }
    }

    async function saveImage(file, category) {
        try {
            // 1. Upload to Storage
            const fileName = `${Date.now()}-${file.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('gallery')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('gallery')
                .getPublicUrl(fileName);

            // 3. Save to Database
            const { error: dbError } = await supabase
                .from('images')
                .insert([{ url: publicUrl, category: category }]);

            if (dbError) throw dbError;

            showToast('Image published successfully!');
            await refreshAll();
            adminNavItems[0].click(); // Back to dashboard
        } catch (e) {
            console.error('Upload Error:', e);
            showToast('Upload Failed: ' + e.message, true);
        }
    }

    async function deleteImage(id, url) {
        showDeleteModal(async () => {
            try {
                // If it's a default image (starts with 'd'), we can't delete it from cloud
                if (String(id).startsWith('d')) {
                    showToast('Cannot delete default system images.', true);
                    return;
                }

                // 1. Delete from Database
                const { error: dbError } = await supabase
                    .from('images')
                    .delete()
                    .eq('id', id);

                if (dbError) throw dbError;

                // 2. Try to delete from Storage if it's a Supabase URL
                if (url.includes('supabase.co')) {
                    const path = url.split('/').pop();
                    await supabase.storage.from('gallery').remove([path]);
                }

                showToast('Image deleted successfully!');
                await refreshAll();
            } catch (e) {
                console.error('Delete Error:', e);
                showToast('Delete Failed: ' + e.message, true);
            }
        });
    }

    async function refreshAll() {
        await getImages();
        updateDashboard();
        renderGalleries();
        if (document.getElementById('manage-grid')) {
            renderManageGallery(document.querySelector('.filter-btn.active')?.getAttribute('data-filter') || 'All');
        }
    }

    // --- UI Notifications & Modals ---
    function showToast(message, isError = false) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast';
        if (isError) toast.style.borderLeftColor = '#ef4444';
        
        toast.innerHTML = `
            <i data-lucide="${isError ? 'alert-circle' : 'check-circle'}"></i>
            <span class="toast-message">${message}</span>
        `;
        
        container.appendChild(toast);
        if (window.lucide) window.lucide.createIcons();

        setTimeout(() => toast.classList.add('active'), 10);
        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    function showDeleteModal(onConfirm) {
        const modal = document.getElementById('delete-modal');
        const confirmBtn = document.getElementById('confirm-delete');
        const cancelBtn = document.getElementById('cancel-delete');
        if (!modal || !confirmBtn || !cancelBtn) return;

        modal.classList.add('active');
        const closeModal = () => modal.classList.remove('active');

        const handleConfirm = async () => {
            await onConfirm();
            closeModal();
            cleanup();
        };

        const handleCancel = () => {
            closeModal();
            cleanup();
        };

        const cleanup = () => {
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) handleCancel();
        });
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
        const images = cachedImages;
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

        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentPage = 1;
                renderManageGallery(btn.getAttribute('data-filter'));
            });
        });

        const publishBtn = document.querySelector('.publish-btn');
        const dropzone = document.getElementById('dropzone');
        const fileInput = document.getElementById('fileInput');
        let selectedFile = null;

        if (dropzone && fileInput) {
            const handleFile = (file) => {
                if (!file.type.startsWith('image/')) return showToast('Please select an image file.', true);
                selectedFile = file;
                const reader = new FileReader();
                reader.onload = (e) => {
                    dropzone.innerHTML = `<img src="${e.target.result}" style="max-height: 100%; max-width: 100%; object-fit: contain;">`;
                    dropzone.style.padding = '10px';
                };
                reader.readAsDataURL(file);
            };
            dropzone.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => { if (e.target.files.length > 0) handleFile(e.target.files[0]); });
        }

        if (publishBtn) {
            publishBtn.addEventListener('click', async () => {
                const categorySelect = document.getElementById('category-select');
                if (!selectedFile) return showToast('Please select an image.', true);
                
                publishBtn.disabled = true;
                publishBtn.textContent = 'Uploading...';
                
                await saveImage(selectedFile, categorySelect.value);
                
                publishBtn.disabled = false;
                publishBtn.textContent = 'Publish to Gallery';
                selectedFile = null;
                fileInput.value = '';
                dropzone.innerHTML = `<div class="dropzone-content"><i data-lucide="upload-cloud" class="upload-icon"></i><p>Drag & Drop Images or <span>Click to Upload</span></p></div>`;
                if (window.lucide) window.lucide.createIcons();
            });
        }
    }

    // --- Admin Manage Gallery Rendering ---
    function renderManageGallery(filter = 'All') {
        const grid = document.getElementById('manage-grid');
        const controls = document.getElementById('pagination-controls');
        if (!grid || !controls) return;
        
        let images = cachedImages;
        if (filter !== 'All') images = images.filter(img => img.category === filter);

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
                    <img src="${img.url}" alt="Gallery Image">
                    <div class="delete-overlay">
                        <button class="delete-btn" data-id="${img.id}" data-url="${img.url}">
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

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const url = btn.getAttribute('data-url');
                deleteImage(id, url);
            });
        });

        if (window.lucide) window.lucide.createIcons();
    }

    function renderPagination(totalPages, filter) {
        const controls = document.getElementById('pagination-controls');
        if (!controls) return;
        controls.innerHTML = '';
        if (totalPages <= 1) return;

        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn';
        prevBtn.innerHTML = '&laquo; Previous';
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = () => { currentPage--; renderManageGallery(filter); gridScrollTop(); };
        controls.appendChild(prevBtn);

        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => { currentPage = i; renderManageGallery(filter); gridScrollTop(); };
            controls.appendChild(pageBtn);
        }

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
        const images = cachedImages;
        const weddingGrid = document.getElementById('wedding-grid');
        const homeWeddingGrid = document.querySelector('#weddings .masonry-grid');
        const modelGallery = document.getElementById('model-gallery');
        const homeModelGrid = document.querySelector('#model .masonry-grid');

        const createItem = (img, isWide = false) => {
            const div = document.createElement('div');
            div.className = `masonry-item reveal ${isWide ? 'wide' : ''}`;
            div.innerHTML = `<img src="${img.url}" alt="Gallery Image">`;
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
            const modelImages = images.filter(img => img.category === 'Model');
            modelImages.forEach((img, i) => {
                const card = document.createElement('div');
                card.className = `model-card ${i === 0 ? 'active' : ''}`;
                card.innerHTML = `<img src="${img.url}" alt="Gallery Image">`;
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

    // Initial Load
    await refreshAll();
    if (window.lucide) window.lucide.createIcons();
});
