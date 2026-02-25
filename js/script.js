document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    // Check local storage or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
        htmlElement.setAttribute('data-theme', savedTheme);
    } else if (prefersDark) {
        htmlElement.setAttribute('data-theme', 'dark');
    }

    themeToggle.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    // Course Data and Selection
    const courseSearchInput = document.getElementById('course-search');
    const courseDatalist = document.getElementById('course-list');
    const addCourseBtn = document.getElementById('add-course-btn');
    const selectedListContainer = document.getElementById('selected-list');
    const quoteForm = document.getElementById('quote-form');

    let availableCourses = []; // To store fetched courses object/array
    let selectedCourses = []; // Array of selected course IDs or objects

    // Discount Toggle Logic
    const discountRadios = document.querySelectorAll('input[name="apply-discount"]');
    const discountContainer = document.getElementById('discount-container');
    const discountInput = document.getElementById('discount-percentage');

    discountRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'si') {
                discountContainer.classList.remove('hidden');
                discountInput.required = true;
            } else {
                discountContainer.classList.add('hidden');
                discountInput.required = false;
                discountInput.value = '';
            }
        });
    });

    // Fetch Courses
    async function fetchCourses() {
        try {
            const response = await fetch('http://localhost:5678/webhook/get-cursos');
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();

            if (Array.isArray(data)) {
                availableCourses = data;
                populateDatalist(data);
            } else if (data.courses && Array.isArray(data.courses)) {
                availableCourses = data.courses;
                populateDatalist(data.courses);
            }
        } catch (error) {
            console.error('Error fetching courses:', error);
            courseSearchInput.placeholder = "Error cargando cursos (API no disponible)";
        }
    }

    function populateDatalist(courses) {
        courseDatalist.innerHTML = '';
        courses.forEach(course => {
            const option = document.createElement('option');
            const courseName = typeof course === 'object' ? (course.nombre || course.nombre_curso || course.name) : course;
            option.value = courseName;
            courseDatalist.appendChild(option);
        });
    }

    function addToSelected(courseName) {
        if (!courseName) return;

        if (selectedCourses.some(c => c.name === courseName)) {
            alert('Este curso ya ha sido seleccionado.');
            return;
        }

        const courseObj = availableCourses.find(c => {
            const cName = typeof c === 'object' ? (c.nombre || c.nombre_curso || c.name) : c;
            return cName === courseName;
        });

        const finalCourseObj = courseObj
            ? {
                id: courseObj.id || courseObj.id_curso || courseName,
                name: courseName
            }
            : { id: courseName, name: courseName };

        selectedCourses.push(finalCourseObj);
        renderSelectedList();
        courseSearchInput.value = '';
    }

    function removeFromSelected(index) {
        selectedCourses.splice(index, 1);
        renderSelectedList();
    }

    function renderSelectedList() {
        selectedListContainer.innerHTML = '';

        if (selectedCourses.length === 0) {
            selectedListContainer.innerHTML = '<p class="empty-message">No has seleccionado ningún curso aún.</p>';
            return;
        }

        selectedCourses.forEach((course, index) => {
            const item = document.createElement('div');
            item.className = 'course-item';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = course.name;

            const overlay = document.createElement('div');
            overlay.className = 'remove-overlay';
            overlay.innerHTML = '<span class="remove-icon">✕</span>';
            overlay.title = "Eliminar curso";

            overlay.addEventListener('click', () => removeFromSelected(index));

            item.appendChild(nameSpan);
            item.appendChild(overlay);
            selectedListContainer.appendChild(item);
        });
    }

    // Add button click
    addCourseBtn.addEventListener('click', () => {
        addToSelected(courseSearchInput.value);
    });

    // Allow Enter key in search input to add
    courseSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addToSelected(courseSearchInput.value);
        }
    });

    // Initial Fetch
    fetchCourses();

    // Form Submission
    quoteForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (selectedCourses.length === 0) {
            alert('Por favor, selecciona al menos un curso.');
            return;
        }

        const nameValue = document.getElementById('name').value;
        const emailValue = document.getElementById('email').value;
        const hasDiscount = document.querySelector('input[name="apply-discount"]:checked').value === 'si';
        let discountValue = 0;

        if (hasDiscount) {
            const rawDiscount = parseFloat(discountInput.value);
            if (isNaN(rawDiscount) || rawDiscount < 0) {
                alert('Por favor, ingresa un descuento válido (no negativo).');
                return;
            }
            discountValue = rawDiscount / 100;
        }

        const formData = {
            nombre: nameValue,
            email: emailValue,
            cursos: selectedCourses.map(c => c.id),
            descuento: discountValue
        };

        const submitBtn = quoteForm.querySelector('.submit-btn');
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Enviando...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('http://localhost:5678/webhook-test/submit-cotizacion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                alert('¡Datos enviados con éxito!');
                quoteForm.reset();
                selectedCourses = [];
                renderSelectedList();
                discountContainer.classList.add('hidden');
            } else {
                throw new Error('Error en el envío');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('Hubo un error al enviar la cotización. Por favor revisa la consola o el webhook.');
        } finally {
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
        }
    });
});
