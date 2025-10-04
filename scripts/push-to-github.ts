import { getUncachableGitHubClient } from '../server/github';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface FileContent {
  path: string;
  content: string;
}

function getAllFiles(dir: string, baseDir: string = dir): FileContent[] {
  const files: FileContent[] = [];
  const entries = readdirSync(dir);

  const ignorePaths = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.replit',
    'replit.nix',
    '.config',
    '.upm',
    'package-lock.json',
    '.env',
    'tmp',
    'logs'
  ];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const relativePath = fullPath.substring(baseDir.length + 1);

    if (ignorePaths.some(ignore => relativePath.startsWith(ignore))) {
      continue;
    }

    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir));
    } else if (stat.isFile()) {
      try {
        const content = readFileSync(fullPath, 'utf-8');
        files.push({ path: relativePath, content });
      } catch (error) {
        console.log(`Skipping binary file: ${relativePath}`);
      }
    }
  }

  return files;
}

async function pushToGitHub() {
  try {
    console.log('🔄 Connecting to GitHub...');
    const octokit = await getUncachableGitHubClient();
    
    const { data: user } = await octokit.rest.users.getAuthenticated();
    console.log(`✅ Authenticated as: ${user.login}`);

    const repoName = 'VaktaAI';
    const repoDescription = 'VaktaAI - AI-Powered Education Platform for Indian Students (CBSE/ICSE/IB/JEE/NEET)';

    console.log(`\n📦 Creating repository: ${repoName}...`);
    
    let repo;
    try {
      const { data } = await octokit.rest.repos.createForAuthenticatedUser({
        name: repoName,
        description: repoDescription,
        private: false,
        auto_init: false
      });
      repo = data;
      console.log(`✅ Repository created: ${repo.html_url}`);
    } catch (error: any) {
      if (error.status === 422) {
        console.log('📌 Repository already exists, using existing repo...');
        const { data } = await octokit.rest.repos.get({
          owner: user.login,
          repo: repoName
        });
        repo = data;
      } else {
        throw error;
      }
    }

    console.log('\n📂 Collecting project files...');
    const files = getAllFiles(process.cwd());
    console.log(`✅ Found ${files.length} files to upload`);

    console.log('\n📤 Pushing files to GitHub...');
    
    let ref;
    try {
      const { data } = await octokit.rest.git.getRef({
        owner: user.login,
        repo: repoName,
        ref: 'heads/main'
      });
      ref = data;
    } catch (error) {
      const { data: newRef } = await octokit.rest.git.createRef({
        owner: user.login,
        repo: repoName,
        ref: 'refs/heads/main',
        sha: (await octokit.rest.git.createCommit({
          owner: user.login,
          repo: repoName,
          message: 'Initial commit',
          tree: (await octokit.rest.git.createTree({
            owner: user.login,
            repo: repoName,
            tree: []
          })).data.sha
        })).data.sha
      });
      ref = newRef;
    }

    const blobs = await Promise.all(
      files.map(async (file) => {
        const { data } = await octokit.rest.git.createBlob({
          owner: user.login,
          repo: repoName,
          content: Buffer.from(file.content).toString('base64'),
          encoding: 'base64'
        });
        return { path: file.path, sha: data.sha, mode: '100644' as const, type: 'blob' as const };
      })
    );

    console.log('✅ All files uploaded as blobs');

    const { data: tree } = await octokit.rest.git.createTree({
      owner: user.login,
      repo: repoName,
      tree: blobs
    });

    const { data: commit } = await octokit.rest.git.createCommit({
      owner: user.login,
      repo: repoName,
      message: 'VaktaAI MVP Complete - AI Tutor, Quiz, Planner, Notes, DocChat',
      tree: tree.sha,
      parents: ref.object ? [ref.object.sha] : []
    });

    await octokit.rest.git.updateRef({
      owner: user.login,
      repo: repoName,
      ref: 'heads/main',
      sha: commit.sha
    });

    console.log('\n✅ Successfully pushed to GitHub!');
    console.log(`🔗 Repository URL: ${repo.html_url}`);
    console.log(`📝 Commit SHA: ${commit.sha}`);
    
  } catch (error) {
    console.error('❌ Error pushing to GitHub:', error);
    throw error;
  }
}

pushToGitHub();
