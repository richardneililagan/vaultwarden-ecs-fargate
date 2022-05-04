import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as ecspatterns from 'aws-cdk-lib/aws-ecs-patterns'
import * as iam from 'aws-cdk-lib/aws-iam'

import type { Cluster } from 'aws-cdk-lib/aws-ecs'
import type { Repository } from 'aws-cdk-lib/aws-ecr'
import type { FileSystem } from 'aws-cdk-lib/aws-efs'

// :: ---

export type VaultwardenServiceProps = {
  cluster: Cluster
  imageRepository: Repository
  version: string
  filesystem: FileSystem
}

/**
 * An ECS service is the unit of scaling for containers in an ECS cluster.
 * This service in particular will maintain and scale the ECS tasks that run
 * the Vaultwarden containers.
 */
class VaultwardenService extends Construct {
  constructor(scope: Construct, id: string, props: VaultwardenServiceProps) {
    super(scope, id)

    const image = ecs.ContainerImage.fromEcrRepository(props.imageRepository, props.version)

    // :: This role takes effect during control plane actions re: this task,
    //    e.g. task creation during scaling events.
    //    It is critical that this execution role has pull permissions from
    //    the ECR repository that contains our copy of the Vaultwarden
    //    server image.
    const executionRole = new iam.Role(this, 'task-exec-role', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    })
    props.imageRepository.grantPull(executionRole)

    const pattern = new ecspatterns.ApplicationLoadBalancedFargateService(
      this,
      'vaultwarden-service',
      {
        cluster: props.cluster,
        desiredCount: 1,

        // :: We only use the smallest possible Fargate instance size here,
        //    because a password manager most likely doesn't need a lot of
        //    resources, especially when idle.
        cpu: 256, // :: 0.25 cpu
        memoryLimitMiB: 512,

        taskImageOptions: { image, executionRole },
        taskSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },

        publicLoadBalancer: true,
      }
    )

    // :: We also need to reference the persistent file store that the task
    //    will use so that the Vaultwarden data survives when containers are
    //    (inevitably) recycled. This will need to be defined in the task definition
    //    that the ECS pattern above automatically generates.
    pattern.taskDefinition.addVolume({
      name: 'efs',
      efsVolumeConfiguration: {
        fileSystemId: props.filesystem.fileSystemId,
        transitEncryption: 'ENABLED',
      },
    })

    // :: Next, the container itself should mount the file system we've
    //    referenced above. Since we're only putting in one container per task
    //    in our service, we can cheat a little and rely on this accessor.
    //    This should guarantee that we get the right container every time.
    pattern.taskDefinition.defaultContainer?.addMountPoints({
      sourceVolume: 'efs', // :: This should match the name provided above.
      containerPath: '/data', // :: Vaultwarden itself expects to write to this directory.
      readOnly: false,
    })

    // :: Finally, an EFS instance is a network appliance.
    //    While it's deployed in the same VPC as our cluster, we will still need
    //    to explicitly allow network visibility between the EFS filesystem
    //    and the containers in this service. By default, network entities are
    //    isolated, unless others are whitelisted (or blacklisted further).
    pattern.service.connections.allowFrom(props.filesystem, ec2.Port.tcp(2049))
    pattern.service.connections.allowTo(props.filesystem, ec2.Port.tcp(2049))

    // :: ---

    new cdk.CfnOutput(this, 'loadbalancer-dns-name', {
      description: 'The DNS name of the load balancer deployed for the Vaultwarden service.',
      value: pattern.loadBalancer.loadBalancerDnsName,
    })
  }
}

export default VaultwardenService
