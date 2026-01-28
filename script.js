/* ==============================================
   ВАЖНО: ИМПОРТЫ FIREBASE
   ============================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ==============================================
   КОНФИГУРАЦИЯ FIREBASE (Твои данные)
   ============================================== */
const firebaseConfig = {
  apiKey: "AIzaSyDlu5_GlhpbjJW6pYcSRMSl8h3ZYolebtA",
  authDomain: "project-6365429806061052639.firebaseapp.com",
  projectId: "project-6365429806061052639",
  storageBucket: "project-6365429806061052639.firebasestorage.app",
  messagingSenderId: "806998312711",
  appId: "1:806998312711:web:95b3bb91a132b49620a7a2"
};

/* ==============================================
   ИНИЦИАЛИЗАЦИЯ
   ============================================== */
let app, db, auth;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("Firebase подключен успешно!");
} catch (error) {
    console.error("Ошибка подключения Firebase:", error);
}

/* ==============================================
   ЛОГИКА UI
   ============================================== */
const ui = {
    init: function() {
        this.bindEvents();
        this.checkAuth();
        this.loadListings(); 
    },

    bindEvents: function() {
        // 1. Навигация по страницам
        document.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                const target = e.target.closest('[data-page]');
                if(!target) return;
                
                e.preventDefault();
                const pageId = target.getAttribute('data-page');
                this.showPage(pageId);
                
                // Закрываем мобильное меню при клике
                this.toggleMobileMenu(false);
            });
        });

        // 2. Мобильное меню (Бургер)
        const burger = document.getElementById('burger-btn');
        const overlay = document.getElementById('nav-overlay');
        
        burger.addEventListener('click', () => {
            // Переключаем состояние (открыть/закрыть)
            const nav = document.getElementById('main-nav');
            const isActive = nav.classList.contains('active');
            this.toggleMobileMenu(!isActive);
        });
        
        // Закрытие по клику на затемнение
        overlay.addEventListener('click', () => this.toggleMobileMenu(false));

        // 3. Формы (Вход / Регистрация)
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('reg-form').addEventListener('submit', (e) => this.handleRegister(e));

        // 4. Переключатель "Создать аккаунт" <-> "Войти"
        document.getElementById('btn-toggle-auth').addEventListener('click', () => {
            // Проверяем, видна ли сейчас форма входа
            const loginForm = document.getElementById('login-form');
            const isLoginVisible = !loginForm.classList.contains('hidden');
            
            // Если Вход виден -> переключаем на Регистрацию (false)
            // Если Вход скрыт (мы в Регистрации) -> переключаем на Вход (true)
            this.toggleAuthView(!isLoginVisible); 
        });

        // 5. Выход из аккаунта
        document.getElementById('btn-logout').addEventListener('click', () => {
            signOut(auth).then(() => {
                this.toggleMobileMenu(false);
                this.showPage('home');
            });
        });

        // 6. Добавление объявления
        document.getElementById('form-add').addEventListener('submit', (e) => this.handleAddListing(e));

        // 7. Фильтры
        document.getElementById('btn-apply-filters').addEventListener('click', () => this.loadListings());
    },

    // Функция управления мобильным меню
    toggleMobileMenu: function(show) {
        const nav = document.getElementById('main-nav');
        const overlay = document.getElementById('nav-overlay');
        const burgerIcon = document.querySelector('#burger-btn i');
        
        if (show) {
            nav.classList.add('active');
            overlay.style.display = 'block';
            burgerIcon.classList.remove('fa-bars');
            burgerIcon.classList.add('fa-times'); // Меняем иконку на крестик
        } else {
            nav.classList.remove('active');
            overlay.style.display = 'none';
            burgerIcon.classList.remove('fa-times');
            burgerIcon.classList.add('fa-bars');
        }
    },

    showPage: function(pageId) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active', 'hidden'));
        document.querySelectorAll('.page').forEach(p => {
            if (p.id !== pageId) p.classList.add('hidden');
        });
        document.getElementById(pageId).classList.add('active');
        window.scrollTo(0, 0);
    },

    /* --- АВТОРИЗАЦИЯ --- */
    checkAuth: function() {
        onAuthStateChanged(auth, (user) => {
            const guestNav = document.getElementById('guest-nav');
            const userNav = document.getElementById('user-nav');
            const userEmail = document.getElementById('user-email');

            if (user) {
                guestNav.style.display = 'none';
                userNav.style.display = 'flex';
                userEmail.textContent = user.email.split('@')[0];
            } else {
                guestNav.style.display = 'flex';
                userNav.style.display = 'none';
            }
        });
    },

    toggleAuthView: function(showLogin) {
        const loginForm = document.getElementById('login-form');
        const regForm = document.getElementById('reg-form');
        const title = document.getElementById('auth-title');
        const switchBtn = document.getElementById('btn-toggle-auth');
        const switchText = document.getElementById('auth-switch-text');

        if (showLogin) {
            loginForm.classList.remove('hidden');
            regForm.classList.add('hidden');
            title.textContent = "Вход";
            switchText.textContent = "Нет аккаунта?";
            switchBtn.textContent = "Создать аккаунт";
        } else {
            loginForm.classList.add('hidden');
            regForm.classList.remove('hidden');
            title.textContent = "Регистрация";
            switchText.textContent = "Уже есть аккаунт?";
            switchBtn.textContent = "Войти";
        }
    },

    handleRegister: async function(e) {
        e.preventDefault();
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-pass').value;

        if(pass.length < 6) {
            alert("Пароль должен быть не менее 6 символов");
            return;
        }

        try {
            await createUserWithEmailAndPassword(auth, email, pass);
            alert("Аккаунт создан! Теперь вы можете публиковать объявления.");
            this.showPage('home');
        } catch (error) {
            alert("Ошибка регистрации: " + error.message);
        }
    },

    handleLogin: async function(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;

        try {
            await signInWithEmailAndPassword(auth, email, pass);
            this.showPage('home');
        } catch (error) {
            alert("Неверный email или пароль.");
        }
    },

    /* --- БАЗА ДАННЫХ --- */
    handleAddListing: async function(e) {
        e.preventDefault();
        
        if (!auth.currentUser) {
            alert("Сначала войдите в аккаунт!");
            this.showPage('auth');
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = "Публикация...";

        const newListing = {
            title: document.getElementById('l-title').value,
            type: document.getElementById('l-type').value,
            price: Number(document.getElementById('l-price').value),
            area: Number(document.getElementById('l-area').value),
            address: document.getElementById('l-address').value,
            img: document.getElementById('l-img').value,
            desc: document.getElementById('l-desc').value,
            author: auth.currentUser.email,
            createdAt: Date.now()
        };

        try {
            await addDoc(collection(db, "listings"), newListing);
            alert("Успешно опубликовано!");
            e.target.reset();
            this.showPage('listings');
            this.loadListings();
        } catch (error) {
            console.error("Error: ", error);
            alert("Ошибка: " + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Опубликовать в базу";
        }
    },

    loadListings: async function() {
        const container = document.getElementById('listings-container');
        const loader = document.getElementById('loader');
        
        container.innerHTML = '';
        loader.classList.remove('hidden');

        try {
            const q = query(collection(db, "listings"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            
            let html = '';
            const typeFilter = document.getElementById('f-type').value;
            const priceFilter = document.getElementById('f-price').value;

            querySnapshot.forEach((doc) => {
                const item = doc.data();
                
                if (typeFilter !== 'all' && item.type !== typeFilter) return;
                if (priceFilter && item.price > Number(priceFilter)) return;

                html += `
                <div class="card">
                    <div class="card-img-wrap">
                        <span class="card-badge ${item.type}">
                            ${item.type === 'rent' ? 'Аренда' : 'Продажа'}
                        </span>
                        <img src="${item.img}" class="card-img" alt="${item.title}" onerror="this.src='https://placehold.co/400x300?text=Нет+фото'">
                    </div>
                    <div class="card-body">
                        <div class="card-price">$${item.price.toLocaleString()}</div>
                        <div class="card-title">${item.title}</div>
                        <div class="card-meta">
                            <span><i class="fas fa-expand"></i> ${item.area} м²</span>
                            <span><i class="fas fa-map-marker-alt"></i> ${item.address}</span>
                        </div>
                        <p style="font-size:0.8rem; color:#888;">Автор: ${item.author ? item.author.split('@')[0] : 'Агент'}</p>
                    </div>
                </div>`;
            });

            if (html === '') {
                container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #777;">Объявлений пока нет.</p>';
            } else {
                container.innerHTML = html;
            }

        } catch (error) {
            console.error("Ошибка загрузки: ", error);
        } finally {
            loader.classList.add('hidden');
        }
    }
};

// Запуск
document.addEventListener('DOMContentLoaded', () => ui.init());