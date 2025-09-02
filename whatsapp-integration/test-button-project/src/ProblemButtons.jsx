import React from 'react';

function ProblemButtons() {
    return (
        <div>
            {/* ❌ PROBLEM: DaisyUI button with explicit text-white */}
            <button className="btn btn-primary px-4 py-2">Get Quote</button>
            
            {/* ❌ PROBLEM: DaisyUI button with text color */}
            <button className="btn btn-secondary-900 px-4 py-2">Submit</button>
            
            {/* ❌ PROBLEM: text-white without guaranteed dark background */}
            <button className="btn bg-transparent px-4 py-2">Invisible Button</button>
            
            {/* ❌ PROBLEM: Dangerous contrast combinations */}
            <div className="bg-white text-gray-900 p-4">Invisible text</div>
            <div className="bg-black text-white p-4">Another invisible text</div>
            <div className="bg-gray-100 text-gray-900 p-4">Bad contrast</div>
            
            {/* ✅ GOOD: Button with explicit background and matching text */}
            <button className="btn bg-blue-600 hover:bg-blue-700 text-white px-4 py-2">Proper Button</button>
            
            {/* ✅ GOOD: DaisyUI button without explicit text color */}
            <button className="btn btn-accent px-4 py-2">Good DaisyUI Button</button>
            
            {/* ⚠️ WARNING: Button without padding */}
            <button className="btn btn-ghost">No Padding</button>
        </div>
    );
}

export default ProblemButtons;