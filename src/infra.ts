import * as cdk from 'aws-cdk-lib'

import VaultwardenStack from '@/stacks/vaultwarden/vaultwarden'

// :: ---

const app = new cdk.App()
cdk.Tags.of(app).add('x:application', 'vaultwarden')

new VaultwardenStack(app, 'vaultwarden-stack')
