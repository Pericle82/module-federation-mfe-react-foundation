# 🏗️ Modern Microfrontend Architecture

> Event-driven microfrontend system with React 18, TypeScript, Styled Components and Module Federation

## 🚀 Quick Start

```bash
# Start all services (recommended for first run)
./start_all_mfe.sh --clean --check

# Quick restart (skip dependencies install)  
./start_all_mfe.sh --fast

# Check service health
./check_mfe_endpoints.sh --detailed

# Stop all services
./stop_all_mfe.sh --force
```

**Main App**: http://localhost:3000

## 🏛️ Architecture

### Services
| Service | Port | Purpose | Key Features |
|---------|------|---------|--------------|
| 🌐 Container | 3000 | App orchestrator | Module Federation, CSS Modules |
| 📦 MFE_1 | 3001 | Items CRUD | Styled Components, Real-time updates |
| 🔍 MFE_2 | 3002 | Items filtering | Loading awareness, Advanced UI |
| 🔧 Service_MFE | 3003 | API + Events | Central event hub, Type-safe |
| 👥 Users_MFE | 3005 | Users management | Modern UI, Error handling |
| 🏪 Store_MFE | 3004 | Redux state | RTK, Global state |
| 🗄️ JSON Server | 4000 | Mock API | CORS, Delay simulation |

### 🎯 Key Features
- **Event-driven sync** - Real-time cross-MFE communication
- **Loading notifications** - Operation-aware UI feedback  
- **Styled Components** - Theme-based design system
- **TypeScript** - Full type safety
- **Error boundaries** - Robust error handling
- **Responsive design** - Mobile-first approach

## 🔄 Event System

```typescript
// Subscribe to data changes
const unsubscribe = serviceApi.onDataChange('items', (items) => {
  setItems(items); // Auto-sync across MFEs
});

// Subscribe to loading states  
const unsubscribeLoading = serviceApi.onLoadingChange('items', (isLoading, operation) => {
  setExternalLoading(isLoading); // Show loading in other MFEs
});
```

## 🎨 Design System

### Shared Theme
```typescript
const theme = {
  colors: { primary: '#764ba2', success: '#28a745', ... },
  spacing: { xs: '4px', sm: '8px', md: '16px', ... },
  typography: { fontFamily: 'system-ui', ... }
}
```

### Styled Components
- **MFE_1**: Purple theme (Items)
- **MFE_2**: Blue theme (Filter)  
- **Users_MFE**: Green theme (Users)
- **Container**: CSS Modules

## 🛠️ Development

### Scripts
```bash
# Development workflow
./start_all_mfe.sh --clean    # Clean install + start
./check_mfe_endpoints.sh      # Health check
./stop_all_mfe.sh            # Stop all services

# Options
--clean   # Remove node_modules
--fast    # Skip npm install
--check   # Auto health check
--force   # Force kill processes
```

### Custom Hooks
```typescript
// Business logic separation
const { items, handleAdd, loaders } = useItems({ serviceApi });
const { users, handleRemove } = useUsers({ serviceApi });
const { filteredItems, externalLoading } = useItemsFilter({ serviceApi });
```

## 🔍 Monitoring

```bash
# Real-time logs
tail -f logs/mfe_1.log
tail -f logs/service_mfe.log

# JSON output for automation
./check_mfe_endpoints.sh --json
```

## 📁 Project Structure

```
├── container/          # Main app (Module Federation host)
├── mfe_1/             # Items CRUD + Styled Components  
├── mfe_2/             # Items filter + Loading awareness
├── service_mfe/       # API layer + Event system
├── users_mfe/         # Users CRUD + Modern UI
├── store_mfe/         # Redux Toolkit state
├── mock_json_server/  # REST API backend
└── *.sh               # Management scripts
```

## 🏆 Architecture Benefits

- ✅ **Loose coupling** - MFEs communicate via events, not direct imports
- ✅ **Scalability** - Add new MFEs without touching existing code
- ✅ **Maintainability** - Each MFE has isolated dependencies
- ✅ **Developer experience** - Type-safe, modern tooling
- ✅ **User experience** - Real-time updates, loading states
- ✅ **Performance** - Code splitting, selective loading

---

*Built with ❤️ using React 18, TypeScript, Webpack 5 Module Federation, and Styled Components*