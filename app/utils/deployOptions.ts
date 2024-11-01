import { Octokit } from '@octokit/rest';
import { RequestError } from '@octokit/request-error';
import { workbenchStore } from '~/lib/stores/workbench';
import { db, getMessages } from '~/lib/persistence';

export type DeployStatus = "success" | "error";

interface BaseDeployResponse {
  status: DeployStatus;
  reason: string;
}

export interface DeployResponseError extends BaseDeployResponse {
  status: "error";
}

export interface DeployResponseSuccess extends BaseDeployResponse {
  status: "success";
  redirectUrl: string;
}

export type DeployResponse = DeployResponseError | DeployResponseSuccess;

export interface ValidationResponse {
  isValid: boolean;
  error?: string;
  warning?: string;
}

export interface DeployStep {
  id: string;
  title: string;
  inputs: DeployInput[];
  validate?: (inputs: Record<string, string>) => Promise<ValidationResponse>;
}

export interface DeployInput {
  name: string;
  type: string;
  placeholder: string;
  required: boolean;
  defaultValue?: string;
  description?: string;
}

export interface Deployer {
  name: string;
  key: string;
  icon: string;
  active: boolean;
  steps?: DeployStep[];
  deploy: (inputs: Record<string, string>, mixedId: string) => Promise<DeployResponse>;
}

const githubDeployer: Deployer = {
  name: "GitHub",
  key: "github",
  icon: "i-ph:github",
  active: true,
  steps: [
    {
      id: "auth",
      title: "Authentication",
      inputs: [
        {
          name: "GitHub Token",
          type: "password",
          placeholder: "GitHub Token",
          required: true,
          description: `Create a personal access token in your <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" class="text-bolt-elements-textPrimary">GitHub developer settings</a>.`
        },
        {
          name: "GitHub Username",
          type: "text",
          placeholder: "Username",
          required: true,
          description: "Which GitHub account should the repository be created under?"
        }
      ],
      validate: async (inputs) => {
        const token = inputs["GitHub Token"];
        if (!token) {
          return { isValid: false, error: "Token is required" };
        }
        try {
          const octokit = new Octokit({ auth: token });

          const { data: { login } } = await octokit.rest.users.getAuthenticated();

          return {
            isValid: true,
            username: login
          };
        } catch (error) {
          let errorMessage = 'Token validation failed';
          if (error instanceof RequestError) {
            switch (error.status) {
              case 401:
                errorMessage = 'Invalid or expired token';
                break;
              case 403:
                errorMessage = 'Token authorization error';
                break;
            }
          }
          return {
            isValid: false,
            error: errorMessage
          };
        }
      }
    },
    {
      id: "repo",
      title: "Repository",
      inputs: [
        {
          name: "Repository Name",
          type: "text",
          placeholder: "Repository Name",
          required: true
        },
        {
          name: "Branch",
          type: "text",
          placeholder: "Branch",
          required: true,
          defaultValue: "main"
        },
        {
          name: "Is Private",
          type: "checkbox",
          placeholder: "Is Private",
          required: true,
          defaultValue: "true"
        }
      ],
      validate: async (inputs) => {
        const repoName = inputs["Repository Name"];
        if (!repoName) {
          return { isValid: false, error: "Repository name is required" };
        }
        try {
          const octokit = new Octokit({ auth: inputs["GitHub Token"] });
          const repo = await octokit.repos.get({ owner: inputs["GitHub Username"], repo: repoName });
          if (repo.status === 200) {
            return { isValid: true, warning: "Repository with this name already exists" };
          }
          return { isValid: true };
        } catch (error) {
          if (error instanceof RequestError && error.status === 404) {
            return { isValid: true };
          }
          return { isValid: false, error: "Repository validation failed" };
        }
      }
    }
  ],
  deploy: async (inputs: Record<string, string>, mixedId: string): Promise<DeployResponse> => {
    try {
      const octokit = new Octokit({ auth: inputs["GitHub Token"] });
      const owner = inputs["GitHub Username"];
      const repo = inputs["Repository Name"];
      const branch = inputs["Branch"] || "main";

      let existingRepo;
      try {
        existingRepo = await octokit.repos.get({ owner, repo });
      } catch (error) {
        if (error instanceof RequestError && error.status === 404) {
          const { data: newRepo } = await octokit.repos.createForAuthenticatedUser({
            name: repo,
            private: inputs["Is Private"] === "true",
            auto_init: true
          });
          existingRepo = { data: newRepo };
        } else {
          throw error;
        }
      }

      const files = workbenchStore.files.get();
      if (!files || Object.keys(files).length === 0) {
        return { status: "error", reason: "No files to deploy" };
      }

      const readmeContent = await generateReadme(mixedId);
      files['/home/project/README.md'] = {
        type: 'file',
        content: readmeContent || '',
        isBinary: false
      };

      const { data: ref } = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`
      });
      const lastCommitSha = ref.object.sha;

      const treeItems = await Promise.all(
        Object.entries(files).map(async ([path, file]) => {
          if (!file || file.type !== 'file') return null;

          const normalizedPath = path.replace(/^\/home\/project\//, '');

          if (file.isBinary) {
            const { data: blob } = await octokit.git.createBlob({
              owner,
              repo,
              content: file.content,
              encoding: 'base64'
            });

            return {
              path: normalizedPath,
              mode: '100644',
              type: 'blob',
              sha: blob.sha
            };
          }

          return {
            path: normalizedPath,
            mode: '100644',
            type: 'blob',
            content: file.content
          };
        })
      );

      const filteredTreeItems: any = treeItems.filter((item): item is NonNullable<typeof item> => item !== null);

      const { data: newTree } = await octokit.git.createTree({
        owner,
        repo,
        base_tree: lastCommitSha,
        tree: filteredTreeItems
      });

      const { data: newCommit } = await octokit.git.createCommit({
        owner,
        repo,
        message: "Deploy from Bolt",
        tree: newTree.sha,
        parents: [lastCommitSha]
      });

      await octokit.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: newCommit.sha
      });

      return {
        status: "success",
        reason: "Files deployed successfully",
        redirectUrl: existingRepo.data.html_url
      };
    } catch (error) {
      console.error(error);
      return {
        status: "error",
        reason: "Failed to deploy to GitHub"
      };
    }
  }
};

const vercelDeployer: Deployer = {
  name: "Vercel",
  key: "vercel",
  icon: "i-ph:vercel",
  active: false,
  steps: [],
  deploy: async (inputs: Record<string, string>) => {
    return { status: "error", reason: "Not implemented yet" };
  }
};

const netlifyDeployer: Deployer = {
  name: "Netlify",
  key: "netlify",
  icon: "i-ph:netlify",
  active: false,
  deploy: async () => ({ status: "error", reason: "Not implemented yet" })
};

const herokuDeployer: Deployer = {
  name: "Heroku",
  key: "heroku",
  icon: "i-ph:heroku",
  active: false,
  deploy: async () => ({ status: "error", reason: "Not implemented yet" })
};

export const DEPLOYERS = new Map<string, Deployer>([
  ["github", githubDeployer],
  ["vercel", vercelDeployer],
  ["netlify", netlifyDeployer],
  ["heroku", herokuDeployer]
]);

export const getDeployer = (key: string): Deployer | undefined => {
  return DEPLOYERS.get(key);
};

export const getDeployers = (): Deployer[] => {
  return Array.from(DEPLOYERS.values());
}

export const deployTo = async (
  deployerKey: string,
  inputs: Record<string, string>,
  mixedId: string
): Promise<DeployResponse> => {
  const deployer = DEPLOYERS.get(deployerKey);

  if (!deployer) {
    return {
      status: "error",
      reason: `Invalid deployer: ${deployerKey}`
    };
  }

  if (!deployer.active) {
    return {
      status: "error",
      reason: `Deployer ${deployer.name} is not currently active`
    };
  }

  const allInputs = (deployer.steps  || []).flatMap(step => step.inputs);
  for (const input of allInputs) {
    if (input.required && !inputs[input.name]) {
      return {
        status: "error",
        reason: `Missing required input: ${input.name}`
      };
    }
  }

  return deployer.deploy(inputs, mixedId);
};

const generateReadme = async (mixedId: string) => {
  if (!mixedId) return;
  if (!db) return;
  const storedMessages = await getMessages(db, mixedId);
  if (storedMessages && storedMessages.messages.length > 0) {
    const messages: any[] = storedMessages.messages;

    const response = await fetch('/api/readme', {
      method: 'POST',
      body: JSON.stringify({
        messages: messages
      }),
    });

    const reader = response.body?.getReader();
    if (reader) {
      const decoder = new TextDecoder();

      let _input = '';
      let _error;

      try {
        while (true) {
          const { value, done } = await reader.read();

          if (done) {
            break;
          }

          _input += decoder.decode(value);
        }
      } catch (error) {
        _error = error;
      } finally {
        if (_error) {
          console.error(_error);
        }

        console.log(_input);
        const regex = /<boltAction type="file" filePath="README.md">([\s\S]*?)<\/boltAction>/;
        const match = _input.match(regex);

        if (match) {
          return match[1].trim();
        }
      }
    }
  }

  return `This is a [Bolt Extended](https://github.com/FurkannM/bolt.new-extended) project deployed to GitHub. 🚀`;
}
