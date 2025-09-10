// Simple component to test imports
export interface SomeComponent {
    render(): string;
}

export class SimpleComponent implements SomeComponent {
    render(): string {
        return "Hello World";
    }
}