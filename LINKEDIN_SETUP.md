# LinkedIn OAuth Setup Guide

## Шаг 1: Создание LinkedIn App

1. Перейдите на [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Нажмите "Create app"
3. Заполните форму:
   - **App name**: MongoDB Content Agent
   - **LinkedIn Page**: Выберите вашу компанию или создайте личную страницу
   - **Privacy policy URL**: https://yourcompany.com/privacy (временно можно использовать https://mongodb.com/privacy)
   - **App logo**: Загрузите логотип (необязательно)

## Шаг 2: Настройка разрешений

1. В разделе **Products** добавьте:
   - **Sign In with LinkedIn using OpenID Connect**
   - **Share on LinkedIn** (требует верификации)
   - **Marketing Developer Platform** (если доступно)

2. В разделе **Auth** настройте:
   - **Authorized redirect URLs**: 
     ```
     http://localhost:3000/auth/linkedin/callback
     ```

## Шаг 3: Получение учетных данных

1. Перейдите во вкладку **Auth**
2. Скопируйте:
   - **Client ID**
   - **Client Secret**

## Шаг 4: Обновление .env файла

Откройте файл `.env` и заполните:

```env
LINKEDIN_CLIENT_ID=ваш_client_id_здесь
LINKEDIN_CLIENT_SECRET=ваш_client_secret_здесь
LINKEDIN_REDIRECT_URI=http://localhost:3000/auth/linkedin/callback
```

## Шаг 5: Получение Access Token

1. Перезапустите приложение после обновления .env
2. Откройте http://localhost:3000/settings.html
3. Нажмите "Authorize LinkedIn"
4. Следуйте инструкциям OAuth процесса
5. Access token будет автоматически сохранен

## Альтернативный способ получения токена

Если кнопка на settings.html не работает, используйте прямой URL:

1. Получите authorization URL:
   ```bash
   curl http://localhost:3000/auth/linkedin/auth
   ```

2. Откройте полученный URL в браузере
3. Авторизуйтесь в LinkedIn
4. Вы будете перенаправлены обратно с access token

## Проверка подключения

После получения токена проверьте подключение:

```bash
curl http://localhost:3000/api/system/status
```

В ответе должно быть `linkedin: connected`.