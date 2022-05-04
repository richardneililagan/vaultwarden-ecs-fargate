import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'

import Network from './constructs/network'
import ImageRepository from './constructs/image-repository'

// :: ---

export type VaultWardenStackProps = cdk.StackProps & {
  //
}

/**
 * This stack encapsulates all of the moving parts that run Vaultwarden.
 * This includes the ECS cluster, a dedicated network for the cluster to run in,
 * the network appliances that provide public access to parts of the system,
 * persistent data storage, and synchronization of container images.
 */
class VaultWardenStack extends cdk.Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id)
    cdk.Tags.of(this).add('x:stack', 'vaultwarden')

    new ImageRepository(this, 'image-repository')
    new Network(this, 'network')
  }
}

export default VaultWardenStack
