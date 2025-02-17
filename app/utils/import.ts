import type { FileMap } from '~/lib/stores/files';

interface GitHubTreeItem {
  path: string;
  type: string;
  url: string;
}

interface GitHubAPIResponse {
  tree: GitHubTreeItem[];
}

/**
 * Converts a GitHub repo into a FileMap structure.
 * @param owner The owner of the repository.
 * @param repo The name of the repository.
 * @param branch The branch to fetch (default is "main").
 * @returns A promise resolving to the FileMap structure.
 */
export async function importFromGitHub(owner: string, repo: string, branch: string = "main"):  Promise<FileMap> {
  const baseUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;

  try {
    // Fetch the repository tree from GitHub
    const response = await fetch(baseUrl, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch repository data: ${response.statusText}`);
    }

    const data: GitHubAPIResponse = await response.json();
    const tree = data.tree;

    // Initialize an empty FileMap
    const fileMap: FileMap = {};

    // Populate the FileMap
    for (const item of tree) {
      if (item.type === "blob") {
        // Fetch file content
        const fileResponse = await fetch(item.url, {
          headers: {
            Accept: "application/vnd.github.v3.raw",
          },
        });

        if (!fileResponse.ok) {
          throw new Error(`Failed to fetch file content for ${item.path}: ${fileResponse.statusText}`);
        }

        const content = await fileResponse.text();

        fileMap[item.path] = {
          type: 'file',
          content,
          isBinary: false, // Assumption; binary check requires additional processing
        };
      }
    }

    return fileMap;
  } catch (error) {
    console.error("Error fetching repository data:", error);
    throw new Error("Failed to fetch repository data.");
  }
}
