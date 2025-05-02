import { getInput, setFailed, setOutput } from "@actions/core";
import github from "@actions/github";
import dedent from "dedent";
import { join } from "node:path";
import { publish_module } from "try-module.cloud";

async function main() {
	try {
		const token = getInput("github-token");
		const secret = getInput("secret");
		const directoy = getInput("directory");
		const organization = getInput("organization");
		const octokit = github.getOctokit(token);
		const { url, command, package_name } = await publish_module(
			secret,
			organization,
			join(process.cwd(), directoy),
		);
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

		const body = dedent`🚀 **Preview Release Available!**
			A preview version of this module is ready for you to try out.
			
			**Install with:**
			
			\`\`\`sh
			${command}
			\`\`\`
			
			> ℹ️ This is a preview release. Please report any issues or feedback!
			
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

		setOutput("url", url);
		setOutput("command", command);
	} catch (error) {
		setFailed(error.message);
	}
}

main();
