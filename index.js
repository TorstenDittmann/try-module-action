import { join } from "node:path";
import { getInput, setFailed, setOutput } from "@actions/core";
import { publish_module } from "pkg.vc";

async function main() {
	try {
		const directory = getInput("directory");
		const organization = getInput("organization");
		const jwt = await get_oidc_token();

		const { urls, package_manager } = await publish_module(
			{
				type: "github_oidc",
				value: jwt,
				endpoint: "https://next.pkg.vc/publish/github",
			},
			organization,
			join(process.cwd(), directory),
		);

		setOutput("url_commit", urls.url_commit);
		setOutput("url_branch", urls.url_branch);
		setOutput("url_pr", urls.url_pr);
		setOutput("command", `${package_manager} install ${urls.url_branch}`);
	} catch (error) {
		console.error(error.message);
		setFailed(error.message);
	}
}

/**
 * @returns {Promise<string>}
 */
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

	const res = await fetch(url, {
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
