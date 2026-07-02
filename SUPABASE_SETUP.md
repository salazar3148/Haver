# Conectar Vida Quest a la nube (Supabase) y publicar en Netlify

La app ya trae todo el código de sincronización. Mientras no configures las
claves, funciona 100% local (como hasta ahora). Sigue estos pasos para activar
la nube y el acceso desde el celular.

## 1) Crear el proyecto en Supabase
1. Entra a https://supabase.com y crea una cuenta (gratis).
2. **New project** → ponle nombre (ej. `vida-quest`) y una contraseña de base de
   datos (guárdala). Región: la más cercana. Espera ~1 min a que se cree.

## 2) Crear la tabla y la seguridad (RLS)
1. En el menú lateral: **SQL Editor** → **New query**.
2. Pega esto y dale **Run**:

```sql
create table if not exists public.app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

create policy "own_select" on public.app_state
  for select using (auth.uid() = user_id);
create policy "own_insert" on public.app_state
  for insert with check (auth.uid() = user_id);
create policy "own_update" on public.app_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Esto crea 1 fila por usuario y garantiza que cada quien solo ve sus datos.

## 3) Crear tu único usuario (sin registro público)
Esta app es de un solo dueño: no hay pantalla de "Regístrate", el usuario se
crea manualmente en el panel para que nadie más pueda crear una cuenta.

1. Menú **Authentication** → **Users** → **Add user** → **Create new user**.
2. Escribe tu email y una contraseña (mínimo 6 caracteres).
3. Marca **Auto Confirm User** (así no necesitas confirmar por correo).
4. Guarda. Ese es el único usuario que existirá; con ese email/contraseña
   inicias sesión en la app desde cualquier dispositivo.

## 4) Copiar tus claves
1. Menú **Project Settings** → **API**.
2. Copia **Project URL** y la **anon public** key.
3. En la carpeta del proyecto, crea un archivo `.env` (al lado de `package.json`)
   con (usa `.env.example` como base):

```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-public-key
```

4. Reinicia `npm run dev`. Ahora la app pedirá iniciar sesión: usa el email y
   contraseña que creaste en el paso 3.

## 5) Publicar en Netlify
1. Sube el proyecto a un repositorio de GitHub (sin el `.env`, ya está en `.gitignore`).
2. Entra a https://netlify.com → **Add new site** → **Import from GitHub** → elige el repo.
3. Build command: `npm run build` · Publish directory: `dist` (ya están en `netlify.toml`).
4. En **Site settings → Environment variables** agrega las **mismas dos** variables
   (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`).
5. **Deploy**. Te dará una URL pública (ej. `https://vida-quest.netlify.app`).
6. (Opcional) En Supabase **Authentication → URL Configuration** agrega esa URL en
   **Site URL** / **Redirect URLs**.

## Listo
Abre la URL en la PC y en el celular, inicia sesión con la misma cuenta y verás
los mismos datos. Sin internet sigue funcionando con localStorage y sincroniza al
reconectar.
