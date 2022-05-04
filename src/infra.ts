import * as cdk from 'aws-cdk-lib'

import VaultWardenStack from '@/stacks/vaultwarden/vaultwarden'

// :: ---

const app = new cdk.App()
cdk.Tags.of(app).add('x:application', 'vaultwarden')

new VaultWardenStack(app, 'vaultwarden-stack')
