# TwitterClone - Projeto Final

## Visão Geral
Este é um projeto completo de um sistema de rede social similar ao Twitter, desenvolvido como exercício final. A aplicação inclui todas as funcionalidades principais de uma rede social moderna.

## Estrutura do Projeto
```
projeto-final/
├── backend/              # Django REST API
├── frontend/             # HTML/CSS/JS estático
│   ├── assets/
│   │   ├── css/         # Estilos CSS responsivos
│   │   ├── js/          # JavaScript para interações
│   │   └── images/      # Imagens e ícones
├── README.md
└── requirements.txt
```

## Funcionalidades Principais

### 🔐 Sistema de Autenticação
- Login e registro de usuários
- Autenticação segura com JWT
- Validação de dados de entrada

### 👤 Perfil de Usuário
- Formulário de perfil em etapas
- Foto de perfil, nome, usuário, bio, data de nascimento
- Preview do perfil durante o cadastro

### 📱 Sistema de Feed
- Feed personalizado com posts apenas de quem o usuário segue
- Ordenação por mais recente
- Interface responsiva

### 👥 Sistema de Seguidores
- Seguir/deixar de seguir usuários
- Contadores de seguidores e seguindo
- Notificações de novos seguidores

### 📝 Sistema de Posts
- Criação de posts com texto
- Upload de imagens
- Interface similar ao Twitter

### ❤️ Sistema de Interação
- Likes/dislikes nos posts
- Sistema de comentários
- Threads de comentários (estrutura em árvore)
- Respostas a comentários

### 📱 Design Responsivo
- Interface otimizada para desktop, tablet e mobile
- Design moderno e profissional
- UX/UI intuitiva

## Tecnologias Utilizadas

### Backend
- **Django REST Framework** - API robusta e escalável
- **SQLite3** - Banco de dados local
- **JWT** - Autenticação segura
- **Python 3.x**

### Frontend
- **HTML5** - Estrutura semântica
- **CSS3** - Estilos modernos e responsivos
- **JavaScript (Vanilla)** - Interações dinâmicas
- **Fetch API** - Comunicação com o backend

## Como Executar

### Pré-requisitos
- Python 3.8+
- pip

### Instalação
1. Clone o repositório
2. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```
3. Configure o banco de dados:
   ```bash
   cd backend
   python manage.py makemigrations
   python manage.py migrate
   ```
4. Crie um superuser:
   ```bash
   python manage.py createsuperuser
   ```
5. Execute o servidor:
   ```bash
   python manage.py runserver
   ```
6. Abra o frontend no navegador:
   ```
   frontend/index.html
   ```

## Arquitetura

### Backend (Django REST API)
- **Models**: User, Post, Comment, Like, Follow
- **Views**: ViewSets para CRUD completo
- **Serializers**: Validação e serialização de dados
- **Authentication**: JWT com refresh tokens
- **Permissions**: Controle de acesso baseado em usuário

### Frontend (Static)
- **Single Page Application** com navegação por JavaScript
- **Componentes modulares** para cada funcionalidade
- **API Client** para comunicação com o backend
- **State Management** simples com localStorage

## Segurança
- Validação de entrada em todas as APIs
- Sanitização de dados
- Autenticação JWT segura
- CORS configurado corretamente
- Rate limiting nas APIs críticas

## Contribuição
Este projeto foi desenvolvido como exercício final acadêmico.

## Autor
Maurício Santana