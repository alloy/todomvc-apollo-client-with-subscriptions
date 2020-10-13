An opinionated starter package for schema deployments to Slash GraphQL.

Running the deploy.js script from the root directory of the repo installs schema.graphql into the Slash GraphQL instance in the .env file.

Takes the following approaches:

1. Store the schema in a single .graphql file and each auth rule in different files.  Reference the auth rules with `<<file-name>>`.  These then get compiled into the schema by the deploy script.
  * This makes it easier to write the auth rules and repeat them in multiple places.
  * Also means there's editing help, syntax highlighting and GraphQL help (if you have a  GraphQL aware editor) for writing auth rules
2.  Store authorization config externally to the schema - in `auth.json`.
  * This makes it easier to tweak the config in different environments.
  * Also makes inserting the public key easier.
  * Also contains automation for adding well known keys from a known provider (such as Auth0) into the setup.
