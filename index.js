import { join } from "node:path";
import { getInput, setFailed, setOutput } from "@actions/core";
import github from "@actions/github";
import dedent from "dedent";
import { publish_module } from "pkg.vc";

async function main() {
	try {
		const token = getInput("github-token");
		const secret = getInput("secret");
		const directory = getInput("directory");
		const organization = getInput("organization");
		const octokit = github.getOctokit(token);

		const { urls, package_manager, package_name } = await publish_module(
			secret,
			organization,
			join(process.cwd(), directory),
		);
		const is_pr = github.context.payload.pull_request !== undefined;
		if (!is_pr) {
			throw new Error("This action is only supported for pull requests.");
		}
		const pr_number = github.context.payload.pull_request.number;
		const { owner, repo } = github.context.repo;
		const comments = await octokit.rest.issues.listComments({
			owner,
			repo,
			issue_number: pr_number,
		});
		const identifier = "pkg-vc:packages";
		const existing_comment = comments.data.find(
			(c) =>
				c.user.login === "github-actions[bot]" && c.body.includes(identifier),
		);

		// Create the new package section with markers
		const package_section = dedent`
			<!-- pkg-vc:${package_name} -->
			### 📦 \`${package_name}\`

			**Install \`${package_name}\` with:**

			\`\`\`sh
			${package_manager} install ${urls.url_commit}
			\`\`\`
			
			**Alternatively, you may specify a branch name or pull request number:**

			\`\`\`sh
			${package_manager} install ${urls.url_branch}
			${package_manager} install ${urls.url_pr}
			\`\`\`
			<!-- /pkg-vc:${package_name} -->
		`;

		let body;
		if (existing_comment) {
			// Check if this package already exists in the comment
			const package_regex = new RegExp(
				`<!-- pkg-vc:${package_name} -->.*?<!-- /pkg-vc:${package_name} -->`,
				"gs",
			);

			if (package_regex.test(existing_comment.body)) {
				// Replace existing package section
				body = existing_comment.body.replace(
					package_regex,
					package_section.trim(),
				);
			} else {
				// Append new package section before the main identifier
				const main_identifier = `<!-- ${identifier} -->`;
				body = existing_comment.body.replace(
					main_identifier,
					`${package_section.trim()}\n\n${main_identifier}`,
				);
			}
		} else {
			// Create new comment
			body = dedent`## 🚀 Previews available on [pkg.vc](https://pkg.vc)!
			
				${package_section.trim()}
				
				<!-- ${identifier} -->`;
		}

		if (existing_comment) {
			await octokit.rest.issues.updateComment({
				owner,
				repo,
				comment_id: existing_comment.id,
				body,
			});
		} else {
			await octokit.rest.issues.createComment({
				owner,
				repo,
				issue_number: pr_number,
				body,
			});
		}

		setOutput("url_commit", urls.url_commit);
		setOutput("url_branch", urls.url_branch);
		setOutput("url_pr", urls.url_pr);
		setOutput("command", `${package_manager} install ${urls.url_branch}`);
	} catch (error) {
		setFailed(error.message);
	}
}

main();
