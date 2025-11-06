# Тестирование онбординга для всех ролей

## Изменения

### ✅ Что реализовано:

1. **Welcome Screens с персонализацией по ролям:**
   - **Student**: "Welcome to your *learning journey*"
   - **Teacher**: "Welcome to *empowered teaching*"
   - **Curator**: "Welcome to *guided mentorship*"
   - **Admin**: "Welcome to the *control center*"

2. **Туры для всех 4 ролей:**
   - Student: 8 шагов (курсы, статистика, streak, календарь, сообщения, профиль)
   - Teacher: 8 шагов (управление курсами, студенты, создание курсов, аналитика)
   - Admin: 6 шагов (система, пользователи, группы, курсы, аналитика)
   - Curator: 7 шагов (группы, студенты, аналитика, календарь, сообщения)

3. **Автоматическое определение дашборда:**
   - Онбординг показывается на `/dashboard` для всех ролей
   - При первом входе показываются welcome screens, затем тур
   - Статус сохраняется на сервере в поле `onboarding_completed`

4. **Интеграция с профилем:**
   - Кнопка "Reset Onboarding" доступна в профиле (только dev mode)
   - Убрана плавающая кнопка с основного экрана

## Как тестировать

### Подготовка:

1. **Запустить backend с миграцией:**
   ```bash
   cd backend
   source venv/bin/activate
   
   # Применить миграцию (если еще не применена)
   POSTGRES_URL="postgresql://myuser:mypassword@localhost:5432/lms_db" alembic upgrade head
   
   # Запустить сервер
   uvicorn src.app:app --reload
   ```

2. **Запустить frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

### Тестирование для каждой роли:

#### 1. Student (Студент)

**Вход:** Войдите как студент (или создайте тестового студента)

**Ожидаемое поведение:**
1. Первый экран: "Hello, [Имя]!" (2 секунды)
2. Второй экран: "Welcome to your *learning journey*" (2.5 секунды)
3. Тур начинается автоматически с 8 шагами:
   - Welcome screen (центральный)
   - Навигация: Courses
   - Dashboard stats
   - Daily streak 🔥
   - Recent courses
   - Навигация: Calendar
   - Навигация: Messages
   - Навигация: Profile

**Проверка data-tour атрибутов:**
- `[data-tour="courses-nav"]` - ✅
- `[data-tour="dashboard-stats"]` - ✅
- `[data-tour="streak-display"]` - ✅
- `[data-tour="recent-courses"]` - ✅
- `[data-tour="calendar-nav"]` - ✅
- `[data-tour="messages-nav"]` - ✅
- `[data-tour="profile-nav"]` - ✅

#### 2. Teacher (Учитель)

**Вход:** Войдите как учитель

**Ожидаемое поведение:**
1. "Hello, [Имя]!"
2. "Welcome to *empowered teaching*"
3. Тур с 8 шагами:
   - Welcome, Teacher! 👨‍🏫
   - Course Management
   - Teaching Dashboard
   - Student Management
   - Create New Course
   - Analytics
   - Schedule Events
   - Student Communication

**Проверка data-tour атрибутов:**
- `[data-tour="courses-nav"]` - ✅
- `[data-tour="dashboard-overview"]` - ✅
- `[data-tour="students-section"]` - ✅
- `[data-tour="create-course"]` - ✅
- `[data-tour="analytics-nav"]` - ✅
- `[data-tour="calendar-nav"]` - ✅
- `[data-tour="messages-nav"]` - ✅

#### 3. Admin (Администратор)

**Вход:** Войдите как администратор

**Ожидаемое поведение:**
1. "Hello, [Имя]!"
2. "Welcome to the *control center*"
3. Тур с 6 шагами:
   - Welcome to Admin Control Center!
   - System Dashboard Overview
   - User Management
   - Group Management
   - Course Administration
   - Analytics & Reports

**Проверка data-tour атрибутов:**
- `[data-tour="dashboard-overview"]` - ✅
- `[data-tour="users-management"]` - ✅
- `[data-tour="groups-section"]` - ✅
- `[data-tour="courses-management"]` - ✅
- `[data-tour="analytics-nav"]` - ✅

#### 4. Curator (Куратор)

**Вход:** Войдите как куратор

**Ожидаемое поведение:**
1. "Hello, [Имя]!"
2. "Welcome to *guided mentorship*"
3. Тур с 7 шагами:
   - Welcome, Curator! 📋
   - Group Overview
   - Your Students
   - Manage Groups
   - Group Analytics
   - Schedule & Events
   - Communication

**Проверка data-tour атрибутов:**
- `[data-tour="dashboard-overview"]` - ✅
- `[data-tour="students-section"]` - ✅
- `[data-tour="groups-section"]` - ✅
- `[data-tour="analytics-nav"]` - ✅
- `[data-tour="calendar-nav"]` - ✅
- `[data-tour="messages-nav"]` - ✅

### Сброс онбординга для повторного тестирования:

1. Перейдите в Profile (`/profile`)
2. Нажмите кнопку "🔄 Reset Onboarding" (видна только в dev mode)
3. Страница перезагрузится
4. Вернитесь на Dashboard - онбординг покажется снова

### Проверка логов (в консоли браузера):

При прохождении онбординга должны появиться:
```
[OnboardingManager] Onboarding check: { userId: X, userRole: "student", hasCompleted: false, ... }
[OnboardingManager] Starting onboarding flow for student
Welcome screens completed, starting tour...
Starting tour: student-onboarding
Tour steps: 8
Step 1 (body): Found ✓
Step 2 ([data-tour="courses-nav"]): Found ✓
...
[OnboardingTour] Tour closed, marking as complete
Tour completed!
Calling completeOnboarding API for user: X
[AuthContext] updateUser called with: { onboarding_completed: true, ... }
```

### Проверка сохранения на сервере:

После завершения онбординга:
1. Перезагрузите страницу (F5)
2. Онбординг НЕ должен показаться снова
3. В логах: `[OnboardingManager] Onboarding already completed, skipping...`

### SQL проверка (опционально):

```bash
docker exec postgres-lms psql -U myuser -d lms_db -c "SELECT id, email, role, onboarding_completed FROM users WHERE email='test@example.com';"
```

Должно показать `onboarding_completed = t` для пользователя, прошедшего онбординг.

## Известные проблемы и решения

### Проблема: Тур не запускается
**Решение:** Проверьте, что все `data-tour` атрибуты присутствуют в DOM. Откройте инспектор и найдите элементы.

### Проблема: Элементы тура не находятся
**Решение:** Увеличено время ожидания до 1000ms перед запуском тура. Если проблема сохраняется, проверьте timing загрузки компонентов.

### Проблема: Онбординг показывается каждый раз
**Решение:** 
1. Проверьте консоль на наличие ошибок API
2. Убедитесь, что миграция применена к базе данных
3. Проверьте, что `POST /users/complete-onboarding` возвращает 200

### Проблема: Кнопка Reset Onboarding не видна
**Решение:** Кнопка показывается только в dev mode (`import.meta.env.PROD === false`). Проверьте, что запущен `npm run dev`, а не production build.

## Чек-лист финального тестирования

- [ ] Student: Welcome screens показываются
- [ ] Student: Тур проходит все 8 шагов
- [ ] Student: Онбординг сохраняется на сервере
- [ ] Student: После перезагрузки онбординг не показывается
- [ ] Teacher: Welcome screens с правильным текстом
- [ ] Teacher: Тур проходит все 8 шагов
- [ ] Teacher: Сохранение работает
- [ ] Admin: Welcome screens "control center"
- [ ] Admin: Тур проходит все 6 шагов
- [ ] Admin: Сохранение работает
- [ ] Curator: Welcome screens "guided mentorship"
- [ ] Curator: Тур проходит все 7 шагов
- [ ] Curator: Сохранение работает
- [ ] Кнопка Reset работает в профиле (dev mode)
- [ ] Логи в консоли корректные
- [ ] База данных обновляется (onboarding_completed = true)
