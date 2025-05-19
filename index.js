import { join } from "node:path";
import { getInput, setFailed, setOutput } from "@actions/core";
import github from "@actions/github";
import dedent from "dedent";
import { publish_module } from "try-module.cloud";

async function main() {
	try {
		const token = getInput("github-token");
		const secret = getInput("secret");
		const directoy = getInput("directory");
		const organization = getInput("organization");
		const octokit = github.getOctokit(token);
		const { urls, package_manager, package_name } = await publish_module(
			secret,
			organization,
			join(process.cwd(), directoy),
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
		const identifier = `try-module:${package_name}`;
		const existing_comment = comments.data.find(
			(c) =>
				c.user.login === "github-actions[bot]" &&
				c.body.includes(identifier),
		);

		const body = dedent`## 🚀 \`${package_name}\`
			**Preview Release Available on [try-module.cloud](https://try-module.cloud)!**

			**Install \`${package_name}\` with:**

			\`\`\`sh
			${package_manager} install ${urls.url_commit}
			\`\`\`
			
			**Alternatively, you may specify a branch name or pull request number:**

			\`\`\`sh
			${package_manager} install ${urls.url_branch}
			${package_manager} install ${urls.url_pr}
			\`\`\`
			
			<!-- ${identifier} -->`;

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
