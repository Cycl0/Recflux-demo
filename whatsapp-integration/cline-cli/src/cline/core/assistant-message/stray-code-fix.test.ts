import { constructNewFileContent } from "./diff"
import { describe, it } from "mocha"
import { expect } from "chai"

describe("Stray Code Detection and Removal", () => {
	describe("V1 Implementation", () => {
		const testCases = [
			{
				name: "removes incomplete JSX opening tag",
				original: "const App = () => {\n  return <div>Hello</div>\n}",
				diff: `<<<<<<< SEARCH
const App = () => {
  return <div>Hello</div>
}
=======
const App = () => {
  return <div>Hello World</div>
}
>>>>>>> REPLACE
<Badge content="A`,
				expected: "const App = () => {\n  return <div>Hello World</div>\n}",
				isFinal: true,
			},
			{
				name: "removes incomplete JSX attribute",
				original: "function Component() {\n  return <span>Text</span>\n}",
				diff: `<<<<<<< SEARCH
function Component() {
  return <span>Text</span>
}
=======
function Component() {
  return <span>Updated Text</span>
}
>>>>>>> REPLACE
<Button size="lg" variant="`,
				expected: "function Component() {\n  return <span>Updated Text</span>\n}",
				isFinal: true,
			},
			{
				name: "removes incomplete lowercase HTML tag",
				original: "<p>Original text</p>",
				diff: `<<<<<<< SEARCH
<p>Original text</p>
=======
<p>Updated text</p>
>>>>>>> REPLACE
<div className="`,
				expected: "<p>Updated text</p>",
				isFinal: true,
			},
			{
				name: "preserves valid complete tags",
				original: "const valid = 'code'",
				diff: `<<<<<<< SEARCH
const valid = 'code'
=======
const valid = 'updated'
>>>>>>> REPLACE
<Badge content="Complete">Valid</Badge>`,
				expected: "const valid = 'updated'\n<Badge content=\"Complete\">Valid</Badge>",
				isFinal: true,
			},
			{
				name: "removes multiple patterns at end",
				original: "export default App",
				diff: `<<<<<<< SEARCH
export default App
=======
export default UpdatedApp
>>>>>>> REPLACE
<Badge
<Button className="incomplete"
<div style="`,
				expected: "export default UpdatedApp",
				isFinal: true,
			},
			{
				name: "handles normal diff markers correctly",
				original: "function test() { return true }",
				diff: `<<<<<<< SEARCH
function test() { return true }
=======
function test() { return false }
>>>>>>> REPLACE`,
				expected: "function test() { return false }",
				isFinal: true,
			},
		]

		testCases.forEach(({ name, original, diff, expected, isFinal }) => {
			it(name, async () => {
				const result = await constructNewFileContent(diff, original, isFinal, "v1")
				expect(result).to.equal(expected)
			})
		})
	})

	describe("V2 Implementation", () => {
		const testCases = [
			{
				name: "removes incomplete JSX opening tag (V2)",
				original: "const App = () => {\n  return <div>Hello</div>\n}",
				diff: `<<<<<<< SEARCH
const App = () => {
  return <div>Hello</div>
}
=======
const App = () => {
  return <div>Hello World</div>
}
>>>>>>> REPLACE
<Badge content="A`,
				expected: "const App = () => {\n  return <div>Hello World</div>\n}",
				isFinal: true,
			},
			{
				name: "removes incomplete JSX attribute (V2)",
				original: "function Component() {\n  return <span>Text</span>\n}",
				diff: `<<<<<<< SEARCH
function Component() {
  return <span>Text</span>
}
=======
function Component() {
  return <span>Updated Text</span>
}
>>>>>>> REPLACE
<Button size="lg" variant="`,
				expected: "function Component() {\n  return <span>Updated Text</span>\n}",
				isFinal: true,
			},
			{
				name: "preserves valid complete tags (V2)",
				original: "const valid = 'code'",
				diff: `<<<<<<< SEARCH
const valid = 'code'
=======
const valid = 'updated'
>>>>>>> REPLACE
<Badge content="Complete">Valid</Badge>`,
				expected: "const valid = 'updated'\n<Badge content=\"Complete\">Valid</Badge>",
				isFinal: true,
			},
		]

		testCases.forEach(({ name, original, diff, expected, isFinal }) => {
			it(name, async () => {
				const result = await constructNewFileContent(diff, original, isFinal, "v2")
				expect(result).to.equal(expected)
			})
		})
	})

	describe("Regression Tests", () => {
		it("handles empty diff content gracefully", async () => {
			const result = await constructNewFileContent("", "original content", true, "v2")
			expect(result).to.equal("original content")
		})

		it("handles only stray code with no valid diff", async () => {
			const result = await constructNewFileContent("<Badge content=\"incomplete", "original", true, "v2")
			expect(result).to.equal("original")
		})

		it("preserves existing functionality for normal diffs", async () => {
			const diff = `<<<<<<< SEARCH
old line
=======
new line
>>>>>>> REPLACE`
			const result = await constructNewFileContent(diff, "old line", true, "v2")
			expect(result).to.equal("new line")
		})
	})
})