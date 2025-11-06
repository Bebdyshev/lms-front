# Tour Guide Implementation - LMS

## Обзор

Приложение использует **NextStep.js** для предоставления интерактивных туров пользователям в зависимости от их роли. После приветственных экранов пользователи проходят тур по основным функциям платформы.

## Компоненты

### 1. WelcomeScreens
- Анимированные приветственные экраны при первом входе
- Персонализированное приветствие с именем пользователя
- Плавные переходы с использованием Framer Motion

### 2. OnboardingManager
- Управляет процессом онбординга
- Показывает приветственные экраны, затем запускает тур
- Отслеживает завершение в localStorage

### 3. OnboardingTour
- Обертка для функционала NextStep.js
- Создает шаги тура на основе роли пользователя
- Управляет жизненным циклом тура

## Туры по ролям

### Администратор (6 шагов)
1. Приветствие в Admin Control Center
2. System Dashboard - статистика системы
3. User Management - управление пользователями
4. Group Management - управление группами
5. Course Administration - администрирование курсов
6. Analytics & Reports - аналитика и отчеты

### Преподаватель
- Teaching Dashboard
- Course Management
- Student Management
- Course Builder
- Analytics

### Студент
- Learning Dashboard
- Courses & Progress
- Daily Streak
- Calendar & Events
- Messages

### Куратор
- Group Overview
- Student Management
- Group Analytics
- Communication Tools

## Структура файлов

```
src/
├── components/
│   ├── OnboardingManager.tsx     # Главный оркестратор
│   ├── OnboardingTour.tsx        # Обертка для NextStep.js
│   └── WelcomeScreens.tsx        # Приветственные экраны
├── config/
│   └── tourSteps.ts              # Конфигурация всех туров
├── mocks/
│   └── next-navigation.ts        # Моки для Next.js
└── pages/
    ├── admin/
    │   └── AdminDashboard.tsx    # Админ панель с data-tour
    └── SettingsPage.tsx          # Настройки с кнопками тура
```

## Использование data-tour атрибутов

Для таргетинга элементов в туре используются атрибуты `data-tour`:

```tsx
<button data-tour="users-management">
  Manage Users
</button>
```

## Добавление новых шагов

1. Добавьте `data-tour` атрибут к элементу:
```tsx
<div data-tour="new-feature">...</div>
```

2. Добавьте шаг в `src/config/tourSteps.ts`:
```typescript
{
  target: '[data-tour="new-feature"]',
  title: 'Новая функция',
  content: 'Описание функции...',
  placement: 'bottom',
}
```

## Управление турами

### Автоматический запуск
- Туры автоматически запускаются для новых пользователей
- Показываются только один раз (tracked by storage)
- Только на странице `/dashboard`
- Работает с localStorage, sessionStorage или in-memory fallback

### Ручной запуск
В Settings доступны кнопки:
- **Restart Tour** - перезапуск тура
- **Reset Complete Onboarding** - полный сброс онбординга

### Storage Fallback
Приложение использует умную систему хранения (`src/utils/storage.ts`):
1. **localStorage** (предпочтительно) - сохраняется между сессиями
2. **sessionStorage** (fallback) - сохраняется на время сессии
3. **in-memory** (последний fallback) - только в текущей вкладке

Это гарантирует работу даже в режиме инкогнито или при отключенных cookies.

## Технический стек

- **NextStep.js** (v2.1.2) - библиотека туров
- **Framer Motion** (v12.x) - анимации welcome screens
- **React Router** - навигация (react-router-dom)
- **TypeScript** - типизация

### Подавление предупреждения навигации

NextStep.js показывает предупреждение "Navigation is not available, using window adapter!" при использовании в обычном React SPA. Мы подавляем это предупреждение глобально в `main.tsx`:

```tsx
// src/main.tsx
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const message = args[0];
  if (
    typeof message === 'string' && 
    message.includes('Navigation is not available, using window adapter')
  ) {
    return; // Подавляем предупреждение
  }
  originalWarn.apply(console, args);
};
```

Это выполняется **до** монтирования React приложения, что гарантирует перехват предупреждения.

## Конфигурация

### Router.tsx
```tsx
import { NextStepProvider, NextStepReact } from 'nextstepjs';

<NextStepProvider>
  <NextStepReact steps={[]}>
    <OnboardingManager>
      {/* Routes */}
    </OnboardingManager>
  </NextStepReact>
</NextStepProvider>
```

### Vite Configuration
```js
// vite.config.js
export default defineConfig({
  resolve: {
    alias: [
      {
        find: 'next/navigation',
        replacement: path.join(process.cwd(), 'src/mocks/next-navigation.ts'),
      },
    ]
  },
  ssr: {
    noExternal: ['nextstepjs', 'motion']
  }
});
```

## Тестирование

Для повторного показа онбординга:
1. Откройте DevTools (F12)
2. Application → Local Storage
3. Удалите ключ `onboarding_completed_[user_id]`
4. Перезагрузите `/dashboard`

## Особенности

- ✅ Разные туры для каждой роли
- ✅ Автоматический запуск при первом входе
- ✅ Возможность пропустить на любом шаге
- ✅ Ручной перезапуск из настроек
- ✅ Плавные анимации
- ✅ Подсветка элементов ("keyhole" эффект)
- ✅ Адаптивный дизайн

## Ссылки

- [NextStep.js Docs](https://nextstepjs.com/docs/react)
- [Framer Motion](https://www.framer.com/motion/)
