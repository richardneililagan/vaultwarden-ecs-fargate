import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as efs from 'aws-cdk-lib/aws-efs'

import Network from './constructs/network'
import ImageRepository from './constructs/image-repository'
import VaultwardenService from './constructs/vaultwarden-service'

// :: ---

const BASE_IMAGE_NAME = 'vaultwarden/server'
const BASE_VERSION = process.env.VAULTWARDEN_BASE_VERSION || 'latest'

export type VaultwardenStackProps = cdk.StackProps & {
  //
}

/**
 * This stack encapsulates all of the moving parts that run Vaultwarden.
 * This includes the ECS cluster, a dedicated network for the cluster to run in,
 * the network appliances that provide public access to parts of the system,
 * persistent data storage, and synchronization of container images.
 */
class VaultwardenStack extends cdk.Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id)
    cdk.Tags.of(this).add('x:stack', 'vaultwarden')

    const imageRepository = new ImageRepository(this, 'image-repository', {
      imageName: BASE_IMAGE_NAME,
      version: BASE_VERSION,
    })

    const { vpc, ecrEndpoint, ecrRepositoryEndpoint, cloudwatchEndpoint } = new Network(
      this,
      'network'
    )

    const cluster = new ecs.Cluster(this, 'vaultwarden-cluster', {
      clusterName: 'vaultwarden-cluster',
      containerInsights: true,
      vpc,
    })

    // :: Generally, anything in the cluster will need access to both
    //    (1) the ECR api for authorization on image pulls,
    //    (2) the ECR repository api for the actual image pulls, and
    //    (3) the Cloudwatch api for submitting task logs.
    ecrEndpoint.connections.allowDefaultPortFrom(cluster)
    ecrRepositoryEndpoint.connections.allowDefaultPortFrom(cluster)
    cloudwatchEndpoint.connections.allowDefaultPortFrom(cluster)

    // :: To be safe, we'll need an outsourced filesystem to serve as
    //    a persistent volume for our Vaultwarden containers.
    //    We'll create an Amazon EFS instance here, then we'll mount this
    //    to the containers when we define the services and tasks.
    const filesystem = new efs.FileSystem(this, 'vaultwarden-fs', {
      fileSystemName: 'vaultwarden-fs',

      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },

      encrypted: true,
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
      enableAutomaticBackups: true,

      // :: For Vaultwarden, this is probably not required, as files may be
      //    _very_ frequently access --- as often as a user queries their stored
      //    credentials from the service, which can be multiple times a day.
      lifecyclePolicy: efs.LifecyclePolicy.AFTER_14_DAYS,
      outOfInfrequentAccessPolicy: efs.OutOfInfrequentAccessPolicy.AFTER_1_ACCESS,
    })

    new VaultwardenService(this, 'vaultwarden-service', {
      imageRepository: imageRepository.repository,
      version: BASE_VERSION,
      cluster,
      filesystem,
    })
  }
}

export default VaultwardenStack
