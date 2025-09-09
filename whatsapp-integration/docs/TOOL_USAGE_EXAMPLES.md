# Tool Usage Examples - Complete Guide

Now that all tools are fixed and working reliably, here are comprehensive examples of how to use each tool for specific scenarios.

## 🔧 write_to_file - Complete File Creation/Replacement

### Use Cases:
- Creating new files from scratch
- Complete file replacement when major changes are needed
- Generating configuration files
- Creating template files

### ✅ Example 1: Create New React Component

```xml
<tool_use name="write_to_file">
<path>src/components/UserProfile.tsx</path>
<content>import React from 'react'
import { Card, CardHeader, CardBody } from '@heroui/card'
import { Avatar } from '@heroui/avatar'
import { Button } from '@heroui/button'

interface UserProfileProps {
  name: string
  email: string
  avatar?: string
}

export default function UserProfile({ name, email, avatar }: UserProfileProps) {
  return (
    <Card className="max-w-md">
      <CardHeader className="flex gap-3">
        <Avatar src={avatar} name={name} />
        <div className="flex flex-col">
          <p className="text-md">{name}</p>
          <p className="text-small text-default-500">{email}</p>
        </div>
      </CardHeader>
      <CardBody>
        <Button color="primary" variant="flat">
          Edit Profile
        </Button>
      </CardBody>
    </Card>
  )
}
</content>
</tool_use>
```

### ✅ Example 2: Create Configuration File

```xml
<tool_use name="write_to_file">
<path>tailwind.config.js</path>
<content>/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        }
      }
    },
  },
  plugins: [],
}
</content>
</tool_use>
```

### ✅ Example 3: Complete File Replacement

```xml
<tool_use name="write_to_file">
<path>src/utils/api.ts</path>
<content>// Complete rewrite of API utilities
import axios, { AxiosResponse } from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
</content>
</tool_use>
```

---

## ✏️ replace_in_file - Precise Search & Replace Operations

### Use Cases:
- Adding/modifying specific functions or components
- Updating imports or exports
- Changing specific lines or blocks
- Adding new properties to existing objects

### ✅ Example 1: Add New Import and Usage

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
>>>>>>> REPLACE
</diff>
</tool_use>
```

### ✅ Example 2: Add New Function to Component

```xml
<tool_use name="replace_in_file">
<path>src/components/UserList.tsx</path>
<diff>
<<<<<<< SEARCH
export default function UserList({ users }: UserListProps) {
  return (
    <div className="space-y-4">
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  )
}
=======
export default function UserList({ users }: UserListProps) {
  const handleUserClick = (userId: string) => {
    console.log('User clicked:', userId)
    // Navigate to user profile
  }

  return (
    <div className="space-y-4">
      {users.map(user => (
        <UserCard 
          key={user.id} 
          user={user} 
          onClick={() => handleUserClick(user.id)}
        />
      ))}
    </div>
  )
}
>>>>>>> REPLACE
</diff>
</tool_use>
```

### ✅ Example 3: Update JSX Props

```xml
<tool_use name="replace_in_file">
<path>src/components/StatusBadge.tsx</path>
<diff>
<<<<<<< SEARCH
<Badge content="Status">
  Active
</Badge>
=======
<Badge content="Status" color="success" variant="flat">
  Active
</Badge>
>>>>>>> REPLACE
</diff>
</tool_use>
```

### ✅ Example 4: Add New Case to Switch Statement

```xml
<tool_use name="replace_in_file">
<path>src/utils/statusHelper.ts</path>
<diff>
<<<<<<< SEARCH
switch (status) {
  case 'active':
    return { color: 'success', text: 'Active' }
  case 'inactive':
    return { color: 'default', text: 'Inactive' }
  default:
    return { color: 'warning', text: 'Unknown' }
}
=======
switch (status) {
  case 'active':
    return { color: 'success', text: 'Active' }
  case 'inactive':
    return { color: 'default', text: 'Inactive' }
  case 'pending':
    return { color: 'warning', text: 'Pending' }
  case 'error':
    return { color: 'danger', text: 'Error' }
  default:
    return { color: 'warning', text: 'Unknown' }
}
>>>>>>> REPLACE
</diff>
</tool_use>
```

### ✅ Example 5: Update Interface Definition

```xml
<tool_use name="replace_in_file">
<path>src/types/user.ts</path>
<diff>
<<<<<<< SEARCH
export interface User {
  id: string
  name: string
  email: string
}
=======
export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'admin' | 'user' | 'moderator'
  createdAt: Date
  isActive: boolean
}
>>>>>>> REPLACE
</diff>
</tool_use>
```

---

## ⚡ execute_command - Run Build, Test, and System Commands

### Use Cases:
- Running build and compilation commands
- Installing packages and dependencies
- Running tests and linting
- Git operations
- File system operations

### ✅ Example 1: Install Dependencies

```xml
<tool_use name="execute_command">
<command>npm install @heroui/badge @heroui/avatar</command>
<requires_approval>false</requires_approval>
</tool_use>
```

### ✅ Example 2: Run TypeScript Build

```xml
<tool_use name="execute_command">
<command>npm run build</command>
<requires_approval>false</requires_approval>
</tool_use>
```

### ✅ Example 3: Run Tests

```xml
<tool_use name="execute_command">
<command>npm test -- --watch=false --coverage</command>
<requires_approval>false</requires_approval>
</tool_use>
```

### ✅ Example 4: Lint and Format Code

```xml
<tool_use name="execute_command">
<command>npm run lint:fix && npm run format</command>
<requires_approval>false</requires_approval>
</tool_use>
```

### ✅ Example 5: Git Operations

```xml
<tool_use name="execute_command">
<command>git add . && git commit -m "Add user profile component with avatar support"</command>
<requires_approval>true</requires_approval>
</tool_use>
```

### ✅ Example 6: Create Directory Structure

```xml
<tool_use name="execute_command">
<command>mkdir -p src/components/ui src/hooks src/utils src/types</command>
<requires_approval>false</requires_approval>
</tool_use>
```

### ✅ Example 7: Check Project Health

```xml
<tool_use name="execute_command">
<command>npm audit && npm run typecheck && npm run test:unit</command>
<requires_approval>false</requires_approval>
</tool_use>
```

---

## 🎯 Combined Workflow Examples

### Scenario 1: Adding a New Feature Component

```xml
<!-- Step 1: Create the component -->
<tool_use name="write_to_file">
<path>src/components/NotificationCenter.tsx</path>
<content>import React, { useState } from 'react'
import { Card, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([])

  return (
    <Card>
      <CardBody>
        <h3>Notifications</h3>
        {notifications.length === 0 ? (
          <p>No notifications</p>
        ) : (
          notifications.map(notification => (
            <div key={notification.id}>{notification.message}</div>
          ))
        )}
      </CardBody>
    </Card>
  )
}
</content>
</tool_use>

<!-- Step 2: Add it to the main layout -->
<tool_use name="replace_in_file">
<path>src/components/Layout.tsx</path>
<diff>
<<<<<<< SEARCH
import Header from './Header'
import Sidebar from './Sidebar'
=======
import Header from './Header'
import Sidebar from './Sidebar'
import NotificationCenter from './NotificationCenter'
>>>>>>> REPLACE
</diff>
</tool_use>

<!-- Step 3: Add to JSX -->
<tool_use name="replace_in_file">
<path>src/components/Layout.tsx</path>
<diff>
<<<<<<< SEARCH
<div className="flex">
  <Sidebar />
  <main className="flex-1">
    {children}
  </main>
</div>
=======
<div className="flex">
  <Sidebar />
  <main className="flex-1">
    {children}
  </main>
  <aside className="w-80">
    <NotificationCenter />
  </aside>
</div>
>>>>>>> REPLACE
</diff>
</tool_use>

<!-- Step 4: Install any new dependencies -->
<tool_use name="execute_command">
<command>npm install @heroui/notification</command>
<requires_approval>false</requires_approval>
</tool_use>

<!-- Step 5: Run build to verify -->
<tool_use name="execute_command">
<command>npm run build</command>
<requires_approval>false</requires_approval>
</tool_use>
```

### Scenario 2: Refactoring with Type Safety

```xml
<!-- Step 1: Create new types -->
<tool_use name="write_to_file">
<path>src/types/notification.ts</path>
<content>export interface Notification {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
}

export interface NotificationState {
  notifications: Notification[]
  unreadCount: number
}
</content>
</tool_use>

<!-- Step 2: Update component to use types -->
<tool_use name="replace_in_file">
<path>src/components/NotificationCenter.tsx</path>
<diff>
<<<<<<< SEARCH
import React, { useState } from 'react'
import { Card, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([])
=======
import React, { useState } from 'react'
import { Card, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { Badge } from '@heroui/badge'
import { Notification, NotificationState } from '../types/notification'

export default function NotificationCenter() {
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0
  })
>>>>>>> REPLACE
</diff>
</tool_use>

<!-- Step 3: Run TypeScript check -->
<tool_use name="execute_command">
<command>npm run typecheck</command>
<requires_approval>false</requires_approval>
</tool_use>
```

---

## ⚠️ Best Practices & Tips

### write_to_file
- ✅ Use for new files or complete rewrites
- ✅ Always include proper imports and exports
- ✅ Ensure proper indentation and formatting
- ❌ Don't use for small changes (use replace_in_file)

### replace_in_file  
- ✅ Make SEARCH block match exactly (including whitespace)
- ✅ Keep changes focused and minimal
- ✅ Test that SEARCH content exists in the file
- ❌ Don't include line numbers or extra context in SEARCH

### execute_command
- ✅ Set requires_approval=false for safe commands
- ✅ Set requires_approval=true for destructive operations
- ✅ Chain related commands with && operator
- ✅ Use absolute paths when possible
- ❌ Don't run interactive commands (use non-interactive flags)

### Error Handling
- ✅ All tools now have proper error logging
- ✅ Failed operations will show detailed error messages  
- ✅ Tools will retry automatically for transient failures
- ✅ Stray code and incomplete tags are automatically cleaned up

---

## 🎉 All Tools Now Work Reliably!

Thanks to the fixes implemented, you can confidently use all three tools without worrying about:
- ❌ TypeError: Cannot read property 'appendLine' of undefined
- ❌ Stray code like `<Badge content="A` corrupting files
- ❌ Tool execution failures due to logging errors

Happy coding! 🚀