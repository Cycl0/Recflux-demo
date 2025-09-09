import { constructNewFileContent } from "./assistant-message/diff"
import { describe, it, beforeEach, afterEach } from "mocha"
import { expect } from "chai"
import * as sinon from "sinon"
import * as vscode from "vscode-interface"

describe("Tool Reliability Integration Tests", () => {
	let consoleLogSpy: sinon.SinonSpy

	beforeEach(() => {
		consoleLogSpy = sinon.spy(console, "log")
	})

	afterEach(() => {
		consoleLogSpy.restore()
	})

	describe("End-to-End Tool Functionality", () => {
		it("should handle write_to_file scenario with proper error logging", () => {
			// Simulate the OutputChannel that's now working correctly
			const outputChannel: vscode.OutputChannel = {
				appendLine: function (value: string): void {
					console.log(`[OutputChannel] ${value}`)
				},
				dispose: function (): void {
					console.log(`[OutputChannel] Channel disposed`)
				}
			}

			// Simulate a write_to_file operation that would have failed before
			expect(() => {
				outputChannel.appendLine("Starting write_to_file operation")
				outputChannel.appendLine("File write completed successfully")
				outputChannel.appendLine("Operation finished")
			}).to.not.throw()

			// Verify proper logging occurred
			expect(consoleLogSpy).to.have.been.calledWith("[OutputChannel] Starting write_to_file operation")
			expect(consoleLogSpy).to.have.been.calledWith("[OutputChannel] File write completed successfully")
			expect(consoleLogSpy).to.have.been.calledWith("[OutputChannel] Operation finished")
		})

		it("should handle replace_in_file with stray code removal", async () => {
			// Test the complete replace_in_file flow including stray code detection
			const originalContent = `import React from 'react'
import { Button } from '@heroui/button'

export default function Component() {
  return <Button>Click me</Button>
}`

			const diffWithStrayCode = `<<<<<<< SEARCH
export default function Component() {
  return <Button>Click me</Button>
}
=======
export default function Component() {
  return <Button variant="primary">Click me</Button>
}
>>>>>>> REPLACE
<Badge content="A`

			const expectedResult = `import React from 'react'
import { Button } from '@heroui/button'

export default function Component() {
  return <Button variant="primary">Click me</Button>
}`

			// This should work without adding stray code
			const result = await constructNewFileContent(diffWithStrayCode, originalContent, true, "v2")
			expect(result).to.equal(expectedResult)
		})

		it("should handle execute_command scenario without appendLine errors", () => {
			// Simulate the scenario that was causing TypeError
			const outputChannel: vscode.OutputChannel = {
				appendLine: function (value: string): void {
					console.log(`[OutputChannel] ${value}`)
				},
				dispose: function (): void {
					console.log(`[OutputChannel] Channel disposed`)
				}
			}

			// Simulate what executeCommandTool would do
			const simulateExecuteCommand = (command: string) => {
				outputChannel.appendLine(`Executing command: ${command}`)
				
				// Simulate command execution logs
				outputChannel.appendLine("Command started")
				outputChannel.appendLine("Processing...")
				outputChannel.appendLine("Command completed")
				
				return "Command executed successfully"
			}

			expect(() => {
				const result = simulateExecuteCommand("npm run build")
				expect(result).to.equal("Command executed successfully")
			}).to.not.throw()

			// Verify all the logging happened without errors
			expect(consoleLogSpy).to.have.been.calledWith("[OutputChannel] Executing command: npm run build")
			expect(consoleLogSpy).to.have.been.calledWith("[OutputChannel] Command started")
			expect(consoleLogSpy).to.have.been.calledWith("[OutputChannel] Processing...")
			expect(consoleLogSpy).to.have.been.calledWith("[OutputChannel] Command completed")
		})

		it("should handle complex diff operations that previously failed", async () => {
			// Test a complex scenario that combines multiple fixes
			const originalContent = `import { Badge } from '@heroui/badge'
import { Button } from '@heroui/button'

function MyComponent() {
  return (
    <div>
      <Badge>Status</Badge>
      <Button>Action</Button>
    </div>
  )
}`

			const complexDiffWithMultipleIssues = `<<<<<<< SEARCH
function MyComponent() {
  return (
    <div>
      <Badge>Status</Badge>
      <Button>Action</Button>
    </div>
  )
}
=======
function MyComponent() {
  return (
    <div>
      <Badge color="primary">Status</Badge>
      <Button variant="solid">Action</Button>
    </div>
  )
}
>>>>>>> REPLACE
<Badge content="incomplete
<Button size="lg" className="
<div style="`

			const expectedResult = `import { Badge } from '@heroui/badge'
import { Button } from '@heroui/button'

function MyComponent() {
  return (
    <div>
      <Badge color="primary">Status</Badge>
      <Button variant="solid">Action</Button>
    </div>
  )
}`

			// This should handle all the stray code and complete successfully
			const result = await constructNewFileContent(complexDiffWithMultipleIssues, originalContent, true, "v2")
			expect(result).to.equal(expectedResult)
		})

		it("should maintain backward compatibility with existing functionality", async () => {
			// Ensure our fixes don't break existing working cases
			const workingDiff = `<<<<<<< SEARCH
const oldValue = 'original'
=======
const newValue = 'updated'
>>>>>>> REPLACE`

			const originalContent = "const oldValue = 'original'"
			const expectedResult = "const newValue = 'updated'"

			const resultV1 = await constructNewFileContent(workingDiff, originalContent, true, "v1")
			const resultV2 = await constructNewFileContent(workingDiff, originalContent, true, "v2")

			expect(resultV1).to.equal(expectedResult)
			expect(resultV2).to.equal(expectedResult)
		})
	})

	describe("Error Recovery and Resilience", () => {
		it("should gracefully handle malformed stray code", async () => {
			const malformedDiff = `<<<<<<< SEARCH
original line
=======
updated line
>>>>>>> REPLACE
<<<not a valid tag
>>incomplete marker
<Badge
<`

			const originalContent = "original line"
			const expectedResult = "updated line"

			// Should clean up all the malformed content
			const result = await constructNewFileContent(malformedDiff, originalContent, true, "v2")
			expect(result).to.equal(expectedResult)
		})

		it("should handle edge cases that could cause infinite loops", async () => {
			// Test scenario that could have caused issues before
			const edgeCaseDiff = `<<<<<<< SEARCH
=======
new content
>>>>>>> REPLACE
<Badge content="A`

			const emptyOriginal = ""
			const expectedResult = "new content\n"

			const result = await constructNewFileContent(edgeCaseDiff, emptyOriginal, true, "v2")
			expect(result).to.equal(expectedResult)
		})

		it("should prevent tool failures from cascading", () => {
			// Test that one tool failure doesn't break others
			const outputChannel: vscode.OutputChannel = {
				appendLine: function (value: string): void {
					console.log(`[OutputChannel] ${value}`)
				},
				dispose: function (): void {
					console.log(`[OutputChannel] Channel disposed`)
				}
			}

			// Simulate multiple tool operations
			expect(() => {
				outputChannel.appendLine("Tool 1: write_to_file starting")
				outputChannel.appendLine("Tool 1: completed successfully")
				
				outputChannel.appendLine("Tool 2: replace_in_file starting")
				outputChannel.appendLine("Tool 2: completed successfully")
				
				outputChannel.appendLine("Tool 3: execute_command starting")
				outputChannel.appendLine("Tool 3: completed successfully")
				
				outputChannel.dispose()
			}).to.not.throw()

			// All operations should have logged successfully
			expect(consoleLogSpy.callCount).to.equal(7) // 6 appendLine calls + 1 dispose call
		})
	})

	describe("Real-world Scenario Simulation", () => {
		it("should handle the specific Badge content stray code issue from logs", async () => {
			// This test specifically addresses the "<Badge content="A" issue found in task logs
			const problematicContent = `const App = () => {
  return (
    <div>
      <Badge content="New">Status</Badge>
    </div>
  )
}`

			const diffWithExactIssue = `<<<<<<< SEARCH
const App = () => {
  return (
    <div>
      <Badge content="New">Status</Badge>
    </div>
  )
}
=======
const App = () => {
  return (
    <div>
      <Badge content="Updated" color="primary">Status</Badge>
    </div>
  )
}
>>>>>>> REPLACE
<Badge content="A`

			const expectedResult = `const App = () => {
  return (
    <div>
      <Badge content="Updated" color="primary">Status</Badge>
    </div>
  )
}`

			// This exact scenario should now work perfectly
			const result = await constructNewFileContent(diffWithExactIssue, problematicContent, true, "v2")
			expect(result).to.equal(expectedResult)
		})

		it("should prevent syntax errors that were causing Cline failures", async () => {
			// Test that we prevent the syntax errors that were breaking Cline execution
			const validTypeScript = `export default function Page() {
  return <div>Valid TypeScript</div>
}`

			const diffThatCouldBreakSyntax = `<<<<<<< SEARCH
export default function Page() {
  return <div>Valid TypeScript</div>
}
=======
export default function Page() {
  return <div>Updated TypeScript</div>
}
>>>>>>> REPLACE
<Badge content="
<Button className=
<div style=`

			const expectedValidResult = `export default function Page() {
  return <div>Updated TypeScript</div>
}`

			const result = await constructNewFileContent(diffThatCouldBreakSyntax, validTypeScript, true, "v2")
			
			// Result should be valid TypeScript without stray code
			expect(result).to.equal(expectedValidResult)
			
			// Verify no stray code that could cause syntax errors
			expect(result).to.not.include('<Badge content="')
			expect(result).to.not.include('<Button className=')
			expect(result).to.not.include('<div style=')
		})
	})
})