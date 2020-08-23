#!/usr/bin/env bash
set -e
source "${BASH_SOURCE%/*}/utils.sh"
require_env "INPUTS_GH_PAGES_BRANCH"
require_env "INPUTS_GITHUB_TOKEN"
require_env "IN_GITHUB_EVENT_NAME"
require_env "IN_GITHUB_REPOSITORY"
require_env "IN_GITHUB_ACTOR"
require_env "IN_GITHUB_SHA"
require_env "OUTPUT_FILE"

if [ "$INPUTS_GH_PAGES_BRANCH" = "false" ]; then
    echo "Skipped."
    exit
fi

target_branch="$INPUTS_GH_PAGES_BRANCH"

# Temporarily move built file as we'll be doing a checkout soon.
mkdir -p /tmp/output-build-action/
mv "$OUTPUT_FILE" /tmp/output-build-action/

# Check if target branch remote exists on remote.
# If it exists, we do a pull, otherwise we create a new orphan branch.
repo_uri="https://github.com/${IN_GITHUB_REPOSITORY}.git/"
if [[ $(git ls-remote --exit-code --heads "$repo_uri" "$target_branch") ]]; then
    echo "Remote branch \"${target_branch}\" exists."
    git fetch origin "$target_branch"
    git checkout "$target_branch"
else
    echo "Remote branch \"${target_branch}\" does not exist."
    git checkout --orphan "$target_branch"
fi

# Bring back the changed file. We'll be serving it as index.html
mv "/tmp/output-build-action/$OUTPUT_FILE" index.html

# Start the commit!
git add .
git status

echo "Committing as ${IN_GITHUB_ACTOR}"
git config user.name "$IN_GITHUB_ACTOR"
git config user.email "$(git show -s --format='%ae' $IN_GITHUB_SHA)"

github_actions_bot="github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>"
original_commmit_message=$(git log --format=%B -n 1 $IN_GITHUB_SHA)
commit_message=$(
    cat <<-EOT_COMMIT_MSG
	chore(rebuild): ${original_commmit_message}

	SHA: ${IN_GITHUB_SHA}
	Reason: ${IN_GITHUB_EVENT_NAME}


	Co-authored-by: ${github_actions_bot}
EOT_COMMIT_MSG
)
echo "$commit_message"

set +e
echo "$commit_message" | git commit -F -
if [ $? -ne 0 ]; then
    echo "Nothing to commit. Skipping deploy."
    exit 0
fi
set -e

git log -p -1 --color

# Push it!
REPO_URI="https://x-access-token:${INPUTS_GITHUB_TOKEN}@github.com/${IN_GITHUB_REPOSITORY}.git/"
git remote set-url origin "$REPO_URI"
git push --force-with-lease origin "$target_branch"
