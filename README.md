# 🐦 TwitterClone

Uma rede social completa inspirada no Twitter, desenvolvida com **Django REST Framework** no backend e **JavaScript Vanilla** no frontend.

**🔗 Live Demo:** [twitter-clone-dczn.onrender.com](https://twitter-clone-dczn.onrender.com)

---

## 📸 Screenshots

| Login | Feed | Perfil |
|-------|------|--------|
| Autenticação JWT | Timeline com posts | Edição de perfil e avatar |

---

## ⚡ Funcionalidades

### Autenticação
- Registro e login com JWT (access + refresh tokens)
- Validação completa de formulários
- Persistência de sessão via localStorage

### Posts
- Criação com texto (até 280 caracteres) e upload de imagens
- Like / Dislike / Repost
- Exclusão de posts próprios
- Feed personalizado (posts de quem você segue)
- Explore (posts populares de todos os usuários)

### Comentários
- Comentários em posts
- Respostas a comentários (thread/árvore)
- Like / Dislike em comentários

### Social
- Seguir / Deixar de seguir usuários
- Contadores de seguidores e seguindo
- Sugestões de usuários para seguir
- Perfil de outros usuários via modal

### Perfil
- Edição de nome, bio, localização, website
- Upload e alteração de foto de perfil
- Alteração de senha
- Visualização de posts, seguindo e seguidores

### Busca & Trending
- Busca por posts, usuários e hashtags
- Trending topics (hashtags mais usadas)
- Resultados em abas (Posts / Usuários)

### Notificações
- Notificações de novos seguidores, likes, comentários e reposts
- Badge com contador de não lidas
- Marcar como lida

### Interface
- Design responsivo (desktop, tablet, mobile)
- Menu hambúrguer em telas menores
- Single Page Application com navegação por JavaScript
- Animações e transições suaves

---

## 🛠️ Tecnologias

### Backend
| Tecnologia | Uso |
|------------|-----|
| Python 3.11 | Linguagem principal |
| Django 5.x | Framework web |
| Django REST Framework | API RESTful |
| SimpleJWT | Autenticação JWT |
| PostgreSQL | Banco de dados (produção) |
| SQLite | Banco de dados (desenvolvimento) |
| WhiteNoise | Servir arquivos estáticos |
| Gunicorn | WSGI server (produção) |
| Pillow | Processamento de imagens |

### Frontend
| Tecnologia | Uso |
|------------|-----|
| HTML5 | Estrutura semântica |
| CSS3 | Estilos modernos com variáveis CSS |
| JavaScript (Vanilla) | SPA sem frameworks |
| Fetch API | Comunicação com o backend |
| Font Awesome | Ícones |
| Google Fonts (Inter) | Tipografia |

---

## 📁 Estrutura do Projeto

```
projeto-final/
├── backend/                  # Django REST API
│   ├── accounts/             # App de autenticação e usuários
│   │   ├── models.py         # User, Follow, UserProfile
│   │   ├── views.py          # Register, Login, Profile, Password
│   │   ├── serializers.py    # Validação de dados
│   │   └── urls.py           # Rotas /api/auth/
│   ├── social/               # App de funcionalidades sociais
│   │   ├── models.py         # Post, Comment, Like, Notification
│   │   ├── views.py          # Feed, Explore, Search, Trending
│   │   ├── serializers.py    # Serialização de posts/comments
│   │   └── urls.py           # Rotas /api/social/
│   ├── twitterclone/         # Configurações do projeto
│   │   ├── settings.py       # Configurações Django
│   │   ├── urls.py           # Rotas principais + SPA catch-all
│   │   └── views.py          # FrontendAppView, health check
│   ├── create_test_users.py  # Script de dados de teste
│   └── manage.py
├── frontend/                 # SPA estática
│   ├── index.html            # Single page com todas as views
│   └── assets/
│       ├── css/
│       │   ├── main.css      # Estilos globais e layout
│       │   ├── auth.css      # Estilos de login/registro
│       │   ├── components.css # Componentes (posts, modais, etc)
│       │   └── responsive.css # Media queries
│       ├── js/
│       │   ├── config.js     # Configurações, endpoints, Utils
│       │   ├── api.js        # Cliente HTTP com refresh token
│       │   ├── auth.js       # Gerenciamento de autenticação
│       │   ├── posts.js      # Gerenciamento de posts
│       │   ├── comments.js   # Sistema de comentários
│       │   ├── profile.js    # Modal de perfil de usuários
│       │   └── app.js        # App principal, navegação, SPA
│       └── images/           # Ícones e avatares
├── build.sh                  # Script de build para deploy
├── requirements.txt          # Dependências Python
└── README.md
```

---

## 🚀 Como Executar

### Desenvolvimento Local

```bash
# 1. Clonar o repositório
git clone https://github.com/SantosJI4/Twitter_clone.git
cd Twitter_clone

# 2. Criar e ativar ambiente virtual
python -m venv .venv
.venv\Scripts\Activate     # Windows
source .venv/bin/activate   # Linux/Mac

# 3. Instalar dependências
pip install -r requirements.txt

# 4. Configurar banco de dados
cd backend
python manage.py migrate

# 5. Criar superusuário
python manage.py createsuperuser

# 6. Criar usuários de teste (opcional)
python create_test_users.py

# 7. Iniciar o servidor
python manage.py runserver
```

Acesse: **http://127.0.0.1:8000**

### Deploy (Render)

O projeto está configurado para deploy no Render com:
- **Build Command:** `chmod +x build.sh && ./build.sh`
- **Start Command:** `cd backend && gunicorn twitterclone.wsgi:application --bind 0.0.0.0:$PORT`
- **Variáveis:** `SECRET_KEY`, `DEBUG=False`, `DATABASE_URL`, `ALLOWED_HOSTS`, `PYTHON_VERSION=3.11.9`

---

## 📡 API Endpoints

### Autenticação (`/api/auth/`)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/register/` | Registrar novo usuário |
| POST | `/login/` | Login com email/senha |
| GET/PUT | `/profile/` | Ver/editar perfil próprio |
| POST | `/change-password/` | Alterar senha |
| GET | `/suggested-users/` | Sugestões de usuários |
| GET | `/users/` | Listar/buscar usuários |
| POST | `/users/{username}/follow/` | Seguir usuário |
| POST | `/users/{username}/unfollow/` | Deixar de seguir |

### Social (`/api/social/`)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/feed/` | Feed personalizado |
| GET | `/explore/` | Posts populares |
| GET | `/search/?q=texto` | Buscar posts |
| GET | `/trending/` | Hashtags em alta |
| POST | `/posts/` | Criar post |
| POST | `/posts/{id}/like/` | Curtir post |
| POST | `/posts/{id}/repost/` | Repostar |
| GET | `/posts/{id}/comments/` | Comentários do post |
| POST | `/comments/` | Criar comentário |
| GET | `/notifications/` | Notificações |

### Tokens (`/api/token/`)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/` | Obter par de tokens |
| POST | `/refresh/` | Renovar access token |

---

## 🧪 Usuários de Teste

Criados automaticamente no deploy via `create_test_users.py`:

| Usuário | Senha | Posts |
|---------|-------|-------|
| maria_silva | Teste123! | 3 |
| joao_santos | Teste123! | 2 |
| ana_costa | Teste123! | 3 |
| pedro_oliveira | Teste123! | 2 |
| julia_lima | Teste123! | 3 |
| lucas_ferreira | Teste123! | 2 |
| camila_souza | Teste123! | 2 |
| rafael_pereira | Teste123! | 3 |
| beatriz_rocha | Teste123! | 2 |
| gabriel_almeida | Teste123! | 3 |

---

## 👤 Autor

**Iury(JISantos)** — [@SantosJI4](https://github.com/SantosJI4)
