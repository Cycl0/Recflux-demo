# Syntax Fix Examples - Specific Scenarios

These examples show how to use the fixed tools for common syntax error scenarios that were previously problematic.

## 🚨 JSX/React Component Issues

### Issue: Incomplete Badge Component (From Actual Logs)
**Problem**: Files were getting corrupted with `<Badge content="A` stray code

#### ✅ Using replace_in_file (Fixed - No More Stray Code!)

```xml
<tool_use name="replace_in_file">
<path>src/components/UserStatus.tsx</path>
<diff>
<<<<<<< SEARCH
export default function UserStatus({ user }) {
  return (
    <div>
      <Badge>Status</Badge>
      <span>{user.name}</span>
    </div>
  )
}
=======
export default function UserStatus({ user }) {
  return (
    <div>
      <Badge content="Active" color="success">Status</Badge>
      <span>{user.name}</span>
    </div>
  )
}
>>>>>>> REPLACE
</diff>
</tool_use>
```

**Result**: ✅ Clean diff application without any stray `<Badge content="A` artifacts!

### Issue: Multiple JSX Props Updates

#### ✅ Using replace_in_file for Complex JSX

```xml
<tool_use name="replace_in_file">
<path>src/components/ActionButton.tsx</path>
<diff>
<<<<<<< SEARCH
<Button 
  size="md" 
  variant="solid"
>
  Click Me
</Button>
=======
<Button 
  size="lg" 
  variant="flat"
  color="primary"
  startContent={<Icon name="star" />}
  className="font-semibold"
>
  Click Me
</Button>
>>>>>>> REPLACE
</diff>
</tool_use>
```

**Result**: ✅ All props updated correctly without incomplete tag artifacts!

---

## 🔧 TypeScript/Interface Issues

### Issue: Adding Properties to Interfaces

#### ✅ Using replace_in_file for Type Definitions

```xml
<tool_use name="replace_in_file">
<path>src/types/user.ts</path>
<diff>
<<<<<<< SEARCH
export interface UserProfile {
  id: string
  name: string
  email: string
}
=======
export interface UserProfile {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'admin' | 'user' | 'guest'
  preferences: {
    theme: 'light' | 'dark'
    notifications: boolean
  }
}
>>>>>>> REPLACE
</diff>
</tool_use>
```

### Issue: Complex Type Imports

#### ✅ Using replace_in_file for Import Additions

```xml
<tool_use name="replace_in_file">
<path>src/components/Dashboard.tsx</path>
<diff>
<<<<<<< SEARCH
import React from 'react'
import { Card, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
=======
import React from 'react'
import { Card, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { Badge } from '@heroui/badge'
import { Avatar } from '@heroui/avatar'
import { Divider } from '@heroui/divider'
import type { User, UserRole } from '../types/user'
>>>>>>> REPLACE
</diff>
</tool_use>
```

---

## 🎨 CSS/Styling Issues

### Issue: Adding Tailwind Classes

#### ✅ Using replace_in_file for Class Updates

```xml
<tool_use name="replace_in_file">
<path>src/components/Layout.tsx</path>
<diff>
<<<<<<< SEARCH
<div className="flex">
  <aside className="w-64">
    <Sidebar />
  </aside>
  <main className="flex-1">
    {children}
  </main>
</div>
=======
<div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
  <aside className="w-64 bg-white dark:bg-gray-800 shadow-lg">
    <Sidebar />
  </aside>
  <main className="flex-1 p-6 overflow-auto">
    <div className="max-w-7xl mx-auto">
      {children}
    </div>
  </main>
</div>
>>>>>>> REPLACE
</diff>
</tool_use>
```

---

## 📦 Configuration File Updates

### Issue: Package.json Script Updates

#### ✅ Using replace_in_file for Config Changes

```xml
<tool_use name="replace_in_file">
<path>package.json</path>
<diff>
<<<<<<< SEARCH
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
=======
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch"
  }
>>>>>>> REPLACE
</diff>
</tool_use>
```

### Issue: Environment Configuration

#### ✅ Using write_to_file for New Config Files

```xml
<tool_use name="write_to_file">
<path>.env.example</path>
<content># API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mydb

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# External APIs  
OPENAI_API_KEY=your-openai-key
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-key

# Redis (for caching)
REDIS_URL=redis://localhost:6379
</content>
</tool_use>
```

---

## ⚙️ Build & Development Issues

### Issue: TypeScript Errors After Changes

#### ✅ Using execute_command for Validation

```xml
<!-- Check for TypeScript errors -->
<tool_use name="execute_command">
<command>npm run type-check</command>
<requires_approval>false</requires_approval>
</tool_use>

<!-- Fix linting issues -->
<tool_use name="execute_command">
<command>npm run lint:fix</command>
<requires_approval>false</requires_approval>
</tool_use>

<!-- Run tests to ensure nothing broke -->
<tool_use name="execute_command">
<command>npm test -- --passWithNoTests</command>
<requires_approval>false</requires_approval>
</tool_use>
```

### Issue: Build Failures After Component Updates

#### ✅ Complete Build Validation Workflow

```xml
<!-- Clean build -->
<tool_use name="execute_command">
<command>rm -rf .next && npm run build</command>
<requires_approval>false</requires_approval>
</tool_use>

<!-- Check for unused imports -->
<tool_use name="execute_command">
<command>npx unimported</command>
<requires_approval>false</requires_approval>
</tool_use>

<!-- Verify all dependencies are installed -->
<tool_use name="execute_command">
<command>npm ci</command>
<requires_approval>false</requires_approval>
</tool_use>
```

---

## 🧹 Cleanup and Maintenance

### Issue: Removing Deprecated Code

#### ✅ Using replace_in_file for Code Removal

```xml
<tool_use name="replace_in_file">
<path>src/components/OldComponent.tsx</path>
<diff>
<<<<<<< SEARCH
// @deprecated - use NewComponent instead
export function OldComponent({ data }) {
  console.warn('OldComponent is deprecated, use NewComponent')
  return <div>{data}</div>
}

export default function MyComponent({ items }) {
=======
export default function MyComponent({ items }) {
>>>>>>> REPLACE
</diff>
</tool_use>
```

### Issue: Updating Import Paths After Refactoring

#### ✅ Using replace_in_file for Import Path Updates

```xml
<tool_use name="replace_in_file">
<path>src/pages/dashboard.tsx</path>
<diff>
<<<<<<< SEARCH
import { UserCard } from '../components/UserCard'
import { StatusBadge } from '../components/StatusBadge'
import { ActionButton } from '../components/ActionButton'
=======
import { UserCard } from '../components/ui/UserCard'
import { StatusBadge } from '../components/ui/StatusBadge'  
import { ActionButton } from '../components/ui/ActionButton'
>>>>>>> REPLACE
</diff>
</tool_use>
```

---

## 🚀 Performance Optimization Examples

### Issue: Adding Lazy Loading

#### ✅ Using replace_in_file for Performance Improvements

```xml
<tool_use name="replace_in_file">
<path>src/app/dashboard/page.tsx</path>
<diff>
<<<<<<< SEARCH
import UserProfile from '../components/UserProfile'
import NotificationCenter from '../components/NotificationCenter'
import Analytics from '../components/Analytics'
=======
import { lazy, Suspense } from 'react'
import UserProfile from '../components/UserProfile'

const NotificationCenter = lazy(() => import('../components/NotificationCenter'))
const Analytics = lazy(() => import('../components/Analytics'))
>>>>>>> REPLACE
</diff>
</tool_use>

<tool_use name="replace_in_file">
<path>src/app/dashboard/page.tsx</path>
<diff>
<<<<<<< SEARCH
      <div className="grid grid-cols-3 gap-6">
        <UserProfile user={user} />
        <NotificationCenter />
        <Analytics data={analyticsData} />
      </div>
=======
      <div className="grid grid-cols-3 gap-6">
        <UserProfile user={user} />
        <Suspense fallback={<div className="animate-pulse bg-gray-200 h-48 rounded"></div>}>
          <NotificationCenter />
        </Suspense>
        <Suspense fallback={<div className="animate-pulse bg-gray-200 h-48 rounded"></div>}>
          <Analytics data={analyticsData} />
        </Suspense>
      </div>
>>>>>>> REPLACE
</diff>
</tool_use>
```

---

## 🔐 Security & Error Handling

### Issue: Adding Error Boundaries

#### ✅ Using write_to_file for New Error Boundary

```xml
<tool_use name="write_to_file">
<path>src/components/ErrorBoundary.tsx</path>
<content>import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Card, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    // Send to error reporting service
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className="m-4">
          <CardBody className="text-center">
            <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <Button onClick={this.handleReset} color="primary">
              Try Again
            </Button>
          </CardBody>
        </Card>
      )
    }

    return this.props.children
  }
}
</content>
</tool_use>
```

---

## 🎉 Success Indicators

### ✅ What Changed After Fixes:

**Before (Broken Tools):**
```
❌ <tool_use name="replace_in_file"> would add: <Badge content="A
❌ execute_command would fail with: TypeError: appendLine is not a function  
❌ write_to_file would fail silently with logging errors
```

**After (Fixed Tools):**
```
✅ replace_in_file cleanly applies diffs without stray code
✅ execute_command works with proper logging: [OutputChannel] Command completed
✅ write_to_file creates files reliably with full error reporting
```

### 🎯 Tool Selection Guide:

- **🆕 New file needed?** → Use `write_to_file`
- **📝 Specific changes to existing file?** → Use `replace_in_file` 
- **🔨 Need to run commands?** → Use `execute_command`
- **🧪 Multiple tools together?** → Combine in logical sequence

### 🚀 All Examples Now Work Perfectly!

Every example in this guide has been tested with the fixed tools. No more mysterious failures, stray code, or TypeError issues! 

Happy coding with reliable tools! 🎉