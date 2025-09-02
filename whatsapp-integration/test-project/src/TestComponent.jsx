import React from 'react';

function TestComponent() {
    var unusedVariable = "This will trigger an ESLint error";
    const   spacingError="This has spacing issues";
    
    return (
        <div>
            <h1>Hello World</h1>
            <p>This is a test component with errors.</p>
        </div>
    );
}

export default TestComponent;