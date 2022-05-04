import * as cdk from 'aws-cdk-lib'

// :: ---

const app = new cdk.App()
cdk.Tags.of(app).add('x:application', 'vaultwarden')
