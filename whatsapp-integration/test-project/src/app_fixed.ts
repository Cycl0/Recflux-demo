// Sample file with intentional errors to test context-aware editing
import { SomeComponent } from './components'

interface User {
    id: number;
    name: string;
    email: string;
    // Missing semicolon above

export class UserManager {
    private users: User[] = []
    
    // Missing closing brace above
    constructor() {
        this.users = [
    
    addUser(user: User): void {
        // Unclosed JSX-like structure
        const element = <div>
            <h1>Welcome {user.name}</h1>
            <p>Email: {user.email}
        </div>
        
        this.users.push(user)
        
        // Orphaned closing brace
        }
    }
    
    getUserById(id: number): User | undefined {
        return this.users.find(u => u.id === id
        // Missing closing parenthesis
    }
    
    // Function with broken syntax
    processUsers(): void {
        this.users.forEach((user) => {
            console.log(user.name)
            // Missing closing brace for forEach
        
        // Stray code that should be cleaned up
        const orphanedVariable = "test"
        
    // Missing closing brace for function
}

// Export with syntax error
export { UserManager, User
