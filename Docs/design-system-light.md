# Design System — Chronos Mono Blue (Light)

> Variante **white mode** do sistema Chronos Mono Blue.
> Mesma estrutura, mesmos princípios, mesmos componentes — tokens invertidos.
> Coloque em `docs/design-system-light.md`.

---

## Filosofia Visual

**Chronos Mono Blue Light** segue os mesmos cinco princípios do dark mode. O que muda é a direção da hierarquia de contraste: no dark, superfícies escuras recebem texto claro. No light, superfícies claras recebem texto escuro — e as sombras ganham protagonismo onde o dark usava bordas.

Ajustes específicos do light mode:

- **Bordas viram sombras.** No dark, bordas `rgba(255,255,255,0.08)` delimitam cards. No light, `box-shadow` faz esse trabalho com mais elegância — bordas finas permanecem apenas onde há necessidade estrutural.
- **Glassmorphism é substituído por elevação.** `backdrop-filter` perde sentido em fundo claro. Modais e overlays ganham sombra profunda no lugar.
- **Noise mantido, opacidade reduzida.** A textura de ruído continua presente mas mais sutil — no light o fundo já tem personalidade própria.
- **Glow do primary é mais contido.** Em fundo escuro, `rgba(0,102,255,0.12)` é sutil. Em fundo claro, o mesmo valor aparece demais — reduzido para `0.08`.

---

## 1. Fontes

Idêntico ao dark mode — nenhuma alteração.

```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
```

| Fonte | Papel | Quando usar |
|---|---|---|
| `Plus Jakarta Sans` | Interface | Títulos, labels, navegação, botões, qualquer texto de UI |
| `Inter` | Corpo | Parágrafos, subtítulos, descrições longas |
| `JetBrains Mono` | Dados | **Exclusivamente** números, códigos, métricas, valores técnicos |

---

## 2. Tokens de Design

```css
:root {
  /* Acento único — idêntico ao dark */
  --primary:      #0066ff;
  --primary-glow: rgba(0, 102, 255, 0.08);  /* reduzido: glow em fundo claro aparece mais */
  --secondary:    #0044cc;

  /* Fundos — invertidos */
  --bg:       #f0f2f5;   /* fundo geral: cinza levemente azulado, não branco puro */
  --card-bg:  #ffffff;   /* cards: branco puro para contraste com o fundo */

  /* Hierarquia de texto — 3 níveis */
  --text:       #0d1117;  /* principal: quase preto, não #000 absoluto */
  --text-muted: #5a6472;  /* secundário */
  --text-dim:   #9aa3ad;  /* terciário / desativado */

  /* Semântica — idêntico ao dark */
  --success: #0066ff;
  --error:   #e03048;    /* levemente mais escuro: contraste em fundo claro */
  --warning: #d97706;    /* ajustado: amarelo puro some em branco */

  /* Superfícies — lógica invertida */
  --glass-border:  rgba(0, 0, 0, 0.08);      /* bordas escuras sutis */
  --border-focus:  rgba(0, 102, 255, 0.4);   /* idêntico */
  --surface:       rgba(0, 0, 0, 0.03);      /* camada interna levemente escura */
  --surface-light: rgba(0, 0, 0, 0.05);

  /* Espaçamento — idêntico ao dark */
  --space-1: 8px;
  --space-2: 16px;
  --space-3: 24px;
  --space-4: 32px;
  --space-5: 40px;
  --space-6: 48px;
  --space-8: 64px;
}
```

> **Por que `--bg: #f0f2f5` e não `#ffffff`?**
> Branco puro como fundo cria excesso de brilho e não diferencia o fundo dos cards. O cinza levemente azulado cria uma camada de profundidade sutil — os cards brancos "flutuam" sobre ele.

---

## 3. CSS Global Base

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif;
}

html, body {
  height: 100vh;
  width: 100vw;
}

body {
  background-color: var(--bg);
  color: var(--text);
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

/* Textura de ruído — mais sutil que no dark */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.015'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 9999;
  opacity: 0.25;  /* reduzido em relação ao dark (0.5) */
}

h1, h2, h3 {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text);
}

h1 { font-size: 3rem;   font-weight: 500; line-height: 1.1; }
h2 { font-size: 1.5rem; font-weight: 600; }
h3 { font-size: 1.1rem; font-weight: 600; }

/* Scrollbar — adaptada para fundo claro */
::-webkit-scrollbar       { width: 6px; }
::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.15); border-radius: 8px; }
* { scrollbar-width: thin; scrollbar-color: rgba(0, 0, 0, 0.15) transparent; }
```

---

## 4. Layout — Sidebar + Page Shell

HTML idêntico ao dark mode. Apenas o CSS muda onde há valores de cor.

### Estrutura HTML

```html
<aside class="sidebar">
  <div class="sidebar-top">
    <button class="sidebar-toggle"><!-- ícone hambúrguer --></button>
    <nav class="sidebar-nav">
      <a href="/" class="sidebar-link active">
        <!-- ícone SVG ou componente -->
        <span class="sidebar-text">Início</span>
      </a>
      <a href="/secao" class="sidebar-link">
        <!-- ícone -->
        <span class="sidebar-text">Seção</span>
      </a>
    </nav>
  </div>
  <div class="sidebar-bottom">
    <!-- perfil do usuário, logout, configurações -->
  </div>
</aside>

<div class="page-shell">
  <div class="page-topbar">
    <div class="page-topbar-left">
      <h1 class="page-title">Nome da Seção</h1>
      <p class="page-subtitle">Descrição opcional</p>
    </div>
    <div class="page-topbar-right">
      <!-- ações globais da página: botões, filtros, perfil -->
    </div>
  </div>
  <div class="page-content">
    <main class="page-main">
      <!-- conteúdo -->
    </main>
  </div>
</div>
```

### CSS — Sidebar

```css
.sidebar {
  position: fixed;
  left: 0; top: 0;
  height: 100vh;
  width: 72px;
  background: var(--card-bg);              /* branco — sidebar destaca do fundo cinza */
  border-right: 1px solid var(--glass-border);
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.06); /* sombra lateral suave */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: stretch;
  padding: var(--space-5) 0 var(--space-4) 0;
  z-index: 1000;
  overflow: hidden;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar.expanded { width: 240px; }

.sidebar-top    { display: flex; flex-direction: column; }
.sidebar-nav    { display: flex; flex-direction: column; gap: var(--space-1); }
.sidebar-bottom {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--glass-border);
  padding-top: var(--space-3);
}

.sidebar-toggle {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  width: 44px; height: 44px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto var(--space-3) auto;
  transition: all 0.2s ease;
}
.sidebar.expanded .sidebar-toggle {
  width: calc(100% - 28px);
  margin-left: 14px;
  justify-content: flex-start;
  padding-left: 10px;
}
.sidebar-toggle:hover {
  background: var(--surface-light);
  color: var(--text);
}

.sidebar-link {
  color: var(--text-muted);
  width: 44px; height: 44px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto;
  text-decoration: none;
  background: transparent;
  position: relative;
  flex-shrink: 0;
  transition: all 0.2s ease;
}
.sidebar.expanded .sidebar-link {
  width: calc(100% - 28px);
  margin: 0 14px;
  justify-content: flex-start;
  padding-left: 10px;
}
.sidebar-link:hover {
  color: var(--text);
  background: var(--surface-light);
}
.sidebar-link.active {
  color: var(--primary);
  background: rgba(0, 102, 255, 0.06);    /* tint azul leve no item ativo */
}
/* Indicador de item ativo — linha vertical à esquerda */
.sidebar-link.active::before {
  content: "";
  position: absolute;
  left: -14px; top: 50%;
  transform: translateY(-50%);
  width: 3px; height: 20px;
  background: var(--primary);
  border-radius: 0 4px 4px 0;
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-text {
  margin-left: 16px;
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}
.sidebar.expanded .sidebar-text {
  opacity: 1;
  transition-delay: 0.1s;
}
```

### CSS — Page Shell

```css
.page-shell {
  width: 100%;
  padding-left: 72px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32px 32px 24px;
  flex-shrink: 0;
}
.page-topbar-left  { display: flex; flex-direction: column; gap: 4px; }
.page-topbar-right { display: flex; align-items: center; gap: 16px; }

.page-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text);                      /* preto escuro — não hardcoded white */
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}
.page-subtitle {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-family: 'Inter', sans-serif;
}

.page-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}
.page-main {
  flex: 1;
  padding: 0 32px 32px;
  overflow-y: auto;
}
```

---

## 5. Componentes

### Card

```css
.card {
  background: var(--card-bg);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  padding: var(--space-5) var(--space-6);
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
}

/* Variante centralizada — para páginas com formulário único */
.card-centered {
  width: 100%;
  max-width: 580px;
  height: fit-content;
}

/* Variante elevada — substitui o glass do dark mode */
.card-elevated {
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.08),
    0 12px 32px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  border-color: rgba(0, 0, 0, 0.06);
}
```

### Header de Seção

```css
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-5);
}
.section-header-actions { display: flex; gap: 12px; }

.section-title {
  font-size: 0.75rem;
  color: var(--text-dim);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: 8px;
  margin-bottom: 16px;
}
```

### Botões

```css
/* Primário — outline por padrão, fill no hover */
.btn {
  padding: 12px 20px;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  letter-spacing: 0.03em;
  text-transform: uppercase;
  border: 1px solid var(--primary);
  background: transparent;
  color: var(--primary);
}
.btn:hover {
  background: var(--primary);
  color: white;
  box-shadow: 0 4px 12px var(--primary-glow);
}
.btn:active { opacity: 0.85; transform: scale(0.98); }

/* Variante sólida */
.btn-solid {
  background: var(--primary);
  color: white;
  border: none;
}
.btn-solid:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px var(--primary-glow);
}

/* Variante ghost — no light usa borda escura sutil */
.btn-ghost {
  background: white;
  border: 1px solid var(--glass-border);
  color: var(--text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.btn-ghost:hover {
  background: var(--surface-light);
  border-color: rgba(0, 0, 0, 0.14);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

/* Variante destrutiva */
.btn-danger {
  border-color: var(--error);
  color: var(--error);
}
.btn-danger:hover {
  background: var(--error);
  color: white;
  box-shadow: 0 4px 12px rgba(224, 48, 72, 0.2);
}

/* Ícone isolado */
.btn-icon {
  width: 40px; height: 40px;
  padding: 0;
  border-radius: 8px;
  background: white;
  border: 1px solid var(--glass-border);
  color: var(--text-muted);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.btn-icon:hover {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 10px var(--primary-glow);
}

/* Adicionar / criar — borda tracejada */
.btn-add {
  width: 100%;
  padding: 12px;
  background: transparent;
  border: 1px dashed rgba(0, 0, 0, 0.18);
  border-radius: 8px;
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: all 0.2s;
}
.btn-add:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: rgba(0, 102, 255, 0.03);
}
```

### Campos de Formulário

```css
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.form-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.input,
.select {
  width: 100%;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  padding: 12px 16px;
  color: var(--text);
  font-size: 1rem;
  font-family: 'Inter', sans-serif;
  transition: all 0.2s;
  outline: none;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
.input:focus,
.select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.1);
}
.input::placeholder { color: var(--text-dim); }

/* Input com ícone prefixado */
.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.input-wrapper .input-icon {
  position: absolute;
  left: 16px;
  color: var(--text-muted);
  pointer-events: none;
  transition: color 0.2s;
}
.input-wrapper:focus-within .input-icon { color: var(--primary); }
.input-wrapper .input { padding-left: 48px; }

.select { appearance: none; cursor: pointer; }
```

### Dados e Métricas

```css
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.metric-card {
  background: white;
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: all 0.2s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}
.metric-card:hover {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.metric-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.metric-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.02em;
}

/* Variante hero — sem glow, usa a cor primary diretamente */
.metric-value-hero {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  color: var(--primary);            /* glow não funciona em fundo claro — usa cor sólida */
}

.metric-value.positive { color: var(--primary); }
.metric-value.negative { color: var(--error); }
.metric-value.accent   { color: var(--primary); }
```

### Badges e Tags

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

/* Mesmas cores semânticas do dark — backgrounds translúcidos funcionam bem em light também */
.badge-primary { background: rgba(0, 102, 255, 0.1);  color: #0050cc; border: 1px solid rgba(0, 102, 255, 0.2); }
.badge-success { background: rgba(0, 102, 255, 0.08); color: #0050cc; border: 1px solid rgba(0, 102, 255, 0.15); }
.badge-error   { background: rgba(224, 48, 72, 0.1);  color: #b02030; border: 1px solid rgba(224, 48, 72, 0.2); }
.badge-warning { background: rgba(217, 119, 6, 0.1);  color: #92580a; border: 1px solid rgba(217, 119, 6, 0.2); }
.badge-neutral { background: var(--surface-light); color: var(--text-muted); border: 1px solid var(--glass-border); }

/* Tag de valor — JetBrains Mono */
.tag-value {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
}
.tag-value.positive { background: rgba(0, 102, 255, 0.08); color: #0050cc; border: 1px solid rgba(0, 102, 255, 0.15); }
.tag-value.negative { background: rgba(224, 48, 72, 0.1);  color: #b02030; border: 1px solid rgba(224, 48, 72, 0.2); }
```

### Info Box

```css
.info-box {
  background: white;
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: all 0.2s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.info-box:hover {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.09);
  transform: translateY(-2px);
}
.info-box-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.info-box-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
  font-family: 'JetBrains Mono', monospace;
}
```

### Callout / Nota com Borda Lateral

```css
.callout {
  padding: 16px 20px;
  background: rgba(0, 0, 0, 0.02);
  border-left: 3px solid var(--primary);
  border-radius: 0 8px 8px 0;
  border-top: 1px solid var(--glass-border);
  border-right: 1px solid var(--glass-border);
  border-bottom: 1px solid var(--glass-border);
}
.callout.warning { border-left-color: var(--warning); }
.callout.error   { border-left-color: var(--error); }
.callout.success { border-left-color: var(--primary); }

.callout-label {
  font-size: 0.65rem;
  color: var(--text-muted);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 6px;
}
.callout-text {
  font-size: 0.9rem;
  color: var(--text-muted);
  line-height: 1.6;
  font-family: 'Inter', sans-serif;
}
```

### Banners de Feedback

```css
.banner {
  padding: 12px 16px;
  border-radius: 8px;
  display: flex; align-items: center; gap: 10px;
  font-size: 0.85rem;
  font-family: 'Inter', sans-serif;
  animation: fadeIn 0.3s ease;
}
/* Cores dos banners com mais contraste em fundo claro */
.banner-error   { background: #fff0f1; border: 1px solid rgba(224, 48, 72, 0.25);  color: #b02030; }
.banner-success { background: #f0f5ff; border: 1px solid rgba(0, 102, 255, 0.2);   color: #0050cc; }
.banner-warning { background: #fffbeb; border: 1px solid rgba(217, 119, 6, 0.25);  color: #92580a; }
.banner-info    { background: #f0f5ff; border: 1px solid rgba(0, 102, 255, 0.2);   color: #0050cc; }
```

---

## 6. Modal

> No light mode, o `backdrop-filter` do overlay é mantido porém o fundo do modal é sólido — sem glassmorphism. Sombra profunda substitui o efeito de profundidade.

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(13, 17, 23, 0.4);       /* overlay mais escuro que no dark */
  backdrop-filter: blur(8px) saturate(120%);
  -webkit-backdrop-filter: blur(8px) saturate(120%);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
  padding: 20px;
  animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal {
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  padding: 32px;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.1),
    0 24px 56px rgba(0, 0, 0, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 1);
  animation: modalIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
}
.modal.large { max-width: 700px; }
.modal.small { max-width: 360px; }

.modal-close {
  position: absolute;
  top: 24px; right: 24px;
  background: var(--surface-light);
  border: 1px solid var(--glass-border);
  color: var(--text-muted);
  width: 32px; height: 32px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-close:hover {
  background: rgba(224, 48, 72, 0.08);
  color: var(--error);
  border-color: rgba(224, 48, 72, 0.2);
  transform: rotate(90deg);
}

.modal-header { margin-bottom: 24px; }
.modal-header h2 {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--text);
  display: flex; align-items: center; gap: 12px;
  letter-spacing: -0.01em;
}

.modal-section-title {
  font-size: 0.75rem;
  color: var(--text-dim);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: 8px;
  margin-bottom: 16px;
}

@media (max-width: 600px) {
  .modal-overlay { padding: 0; }
  .modal {
    height: 100dvh;
    max-height: 100dvh;
    max-width: 100%;
    border-radius: 0;
    border: none;
    padding: 60px 16px 24px;
    background: var(--bg);
    box-shadow: none;
  }
  .modal-close { top: 16px; right: 16px; }
}
```

---

## 7. Página de Login / Autenticação

```css
.auth-container {
  min-height: 100vh;
  width: 100%;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
  padding: 48px 40px;
  border-radius: 12px;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.08),
    0 16px 40px rgba(0, 0, 0, 0.06);
  animation: modalIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.auth-header { text-align: center; margin-bottom: 40px; }

.auth-logo {
  width: 64px; height: 64px;
  background: var(--primary);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 20px;
  color: white;
  box-shadow: 0 4px 16px var(--primary-glow);
}

.auth-header h1 { font-size: 2rem; margin-bottom: 8px; color: var(--text); }
.auth-header p  { color: var(--text-muted); font-size: 0.9rem; }

.auth-form { display: flex; flex-direction: column; gap: 20px; }

.auth-submit {
  height: 56px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 12px;
  transition: all 0.3s;
  margin-top: 8px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  box-shadow: 0 4px 12px var(--primary-glow);
}
.auth-submit:hover    { filter: brightness(1.08); transform: translateY(-2px); box-shadow: 0 8px 20px var(--primary-glow); }
.auth-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }

.auth-footer { margin-top: 32px; text-align: center; }
.auth-footer button {
  background: none; border: none;
  color: var(--text-muted);
  font-size: 0.9rem; cursor: pointer;
  transition: color 0.2s;
}
.auth-footer button:hover { color: var(--primary); text-decoration: underline; }
```

---

## 8. Animações

Idênticas ao dark mode — animações não dependem do tema.

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes modalIn {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-12px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
}

.animate-spin   { animation: spin 1s linear infinite; }
.animate-pulse  { animation: pulse 2s ease infinite; }
.animate-fadein { animation: fadeIn 0.3s ease forwards; }
```

| Curva | Valor | Contexto |
|---|---|---|
| Bounce — entrada com impacto | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Modais, cards de autenticação |
| Layout — transições de estrutura | `cubic-bezier(0.4, 0, 0.2, 1)` | Sidebar expand, page transitions |
| UI — microinterações rápidas | `cubic-bezier(0.16, 1, 0.3, 1)` | Botões, inputs, hovers |

---

## 9. Responsivo — Mobile

```css
@media (max-width: 800px) {

  .sidebar {
    top: auto; bottom: 0; left: 0; right: 0;
    flex-direction: row !important;
    width: 100% !important;
    height: auto !important;
    padding: 10px 16px !important;
    padding-bottom: calc(10px + env(safe-area-inset-bottom)) !important;
    border-top: 1px solid var(--glass-border);
    border-right: none;
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.06);  /* sombra pra cima */
    justify-content: space-between !important;
  }
  .sidebar-top    { flex-direction: row !important; flex: 1; align-items: center; }
  .sidebar-nav    { flex-direction: row !important; flex: 1; justify-content: space-around; gap: 0 !important; }
  .sidebar-bottom { flex-direction: row !important; border-top: none !important; padding-top: 0 !important; align-items: center; }
  .sidebar-toggle { display: none !important; }
  .sidebar-text   { display: none !important; }
  .sidebar-link   { width: 44px !important; height: 44px !important; margin: 0 !important; }
  .sidebar-link.active { background: transparent !important; }

  .sidebar-link.active::before {
    left: 50% !important;
    top: -10px !important;
    transform: translateX(-50%) !important;
    width: 20px !important;
    height: 3px !important;
    border-radius: 0 0 4px 4px !important;
  }

  .page-shell  { padding-left: 0; }
  .page-topbar { padding: 24px 20px 16px; }
  .page-main   { padding: 0 20px 96px; }

  .card {
    border-radius: 12px;          /* mantém radius no light — sem borda, radius ajuda a delimitar */
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    padding: 20px 16px;
  }

  body::before { display: none; }

  h1      { font-size: 1.4rem; }
  .metrics-grid { grid-template-columns: 1fr 1fr; }
}
```

---

## 10. Referência Rápida

### Diff Dark → Light

| Elemento | Dark | Light |
|---|---|---|
| `--bg` | `#090b0e` | `#f0f2f5` |
| `--card-bg` | `#0f1217` | `#ffffff` |
| `--text` | `#f3f5f8` | `#0d1117` |
| `--text-muted` | `#8e99a7` | `#5a6472` |
| `--text-dim` | `#556070` | `#9aa3ad` |
| `--error` | `#ff4a5a` | `#e03048` |
| `--warning` | `#ffb700` | `#d97706` |
| `--glass-border` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.08)` |
| `--surface` | `rgba(255,255,255,0.03)` | `rgba(0,0,0,0.03)` |
| `--primary-glow` | `rgba(0,102,255,0.12)` | `rgba(0,102,255,0.08)` |
| Sidebar bg | `var(--bg)` | `var(--card-bg)` — branco |
| Sidebar sombra | borda direita | `box-shadow` lateral |
| Card elevação | borda + sombra preta | sombra cinza suave |
| Card glass | `backdrop-filter` blur | sem glass — `.card-elevated` |
| Hover de superfície | `rgba(255,255,255,0.05)` | `rgba(0,0,0,0.04)` |
| Banner cores | bg escuro + texto claro | bg pastel + texto escuro |
| Noise opacity | `0.5` | `0.25` |
| Glow em hero | `text-shadow` azul | cor primary sólida, sem glow |
| Modal mobile bg | `var(--bg)` preto | `var(--bg)` cinza claro |

### Paleta Light

| Token | Valor | Uso |
|---|---|---|
| `--primary` | `#0066ff` | Todo elemento ativo, acionável ou em foco |
| `--primary-glow` | `rgba(0,102,255,0.08)` | Sombras de botões, inputs focados |
| `--bg` | `#f0f2f5` | Fundo da aplicação |
| `--card-bg` | `#ffffff` | Cards, modais, sidebar, formulários |
| `--text` | `#0d1117` | Texto principal |
| `--text-muted` | `#5a6472` | Labels, subtítulos, ícones inativos |
| `--text-dim` | `#9aa3ad` | Texto desativado, títulos de seção |
| `--error` | `#e03048` | Erro, negativo, destrutivo |
| `--warning` | `#d97706` | Alerta, pendente, atenção |
| `--glass-border` | `rgba(0,0,0,0.08)` | Bordas de cards e divisores |
| `--surface` | `rgba(0,0,0,0.03)` | Camada interna de superfície |
| `--surface-light` | `rgba(0,0,0,0.05)` | Hover de botões ghost, toggles |

### Regras Inegociáveis (light mode)

| Decisão | Regra |
|---|---|
| Fundo | `#f0f2f5`, não branco puro. Cards são o branco. |
| Glow | Não usar `text-shadow` em valores hero. Usar `color: var(--primary)` sólido. |
| Glass | Não usar `backdrop-filter` em cards. Apenas no overlay do modal. |
| Sombras | Substituem bordas onde há elevação. Nunca sombra preta — sempre `rgba(0,0,0,0.06–0.14)`. |
| Badges | Texto dos badges deve ser a versão **escura** da cor semântica (ex: `#0050cc`, `#b02030`). |
| Banners | Fundo pastel da cor semântica + texto escuro. Nunca fundo translúcido escuro. |
| Acento | `--primary` permanece `#0066ff` — mesmo do dark. |
| Monospace | Mesma regra: `JetBrains Mono` apenas para dados numéricos. |
