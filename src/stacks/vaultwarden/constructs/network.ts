import { Construct } from 'constructs'
import * as ec2 from 'aws-cdk-lib/aws-ec2'

// :: ---

export type NetworkProps = {
  //
}

/**
 * Simply creates a dedicated VPC network for use with the application cluster.
 */
class Network extends Construct {
  vpc: ec2.Vpc

  // :: We maintain a handful of PrivateLink endpoints instead of housing
  //    NAT gateways / instances. See below.
  // ecrEndpoint: ec2.InterfaceVpcEndpoint
  // ecrRepositoryEndpoint: ec2.InterfaceVpcEndpoint
  // cloudwatchEndpoint: ec2.InterfaceVpcEndpoint
  // s3Endpoint: ec2.GatewayVpcEndpoint

  constructor(scope: Construct, id: string) {
    super(scope, id)

    this.vpc = new ec2.Vpc(this, 'network-vpc', {
      vpcName: 'vaultwarden-network',

      cidr: '20.0.0.0/24', // :: Feel free to change this to something you prefer.
      maxAzs: 2, // :: Feel free to change this to 3, if you'd like. Just two is plenty though.

      // :: The Vaultwarden workload doesn't particularly need to make outgoing requests ---
      //    it needs to only be accessible via load balancer/s that are open publicly.
      //    The plan here is that tasks / pods that run the Vaultwarden servers will
      //    be put in the isolated subnets, while the load balancer/s will be in the
      //    public subnets.
      subnetConfiguration: [
        {
          name: 'isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        {
          name: 'ingress',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    })

    // // :: The ECS cluster will need network connectivity to _at least_ the
    // //    Amazon ECR service for the container image/s it will use.
    // //    (Remember: we duplicated the public Vaultwarden on Docker Hub
    // //    to a private Amazon ECR repository).
    // //    However, instead of creating NAT gateway appliances in our VPC
    // //    to allow for outbound internet connections, we'll instead create
    // //    VPC interface endpoints via AWS PrivateLink here. This provides
    // //    completely private network connectivity to our choice of services
    // //    (here, Amazon ECR), without having to bleed out to the public net.
    // // :: An additional benefit of this approach is that we don't have to deal
    // //    with NAT gateways' instanced pricing --- for something like a
    // //    password manager, we really don't need to be paying 24/7 for a
    // //    network appliance that we only use on occasion. PrivateLink endpoints
    // //    let us leverage serverless pricing, so this is most likely a better
    // //    choice.

    // // :: This is the PrivateLink endpoint to the ECR API, which allows our
    // //    tasks to authenticate and authorize themselves for pulling images.
    // this.ecrEndpoint = this.vpc.addInterfaceEndpoint('ecr-endpoint', {
    //   service: ec2.InterfaceVpcEndpointAwsService.ECR,
    //   privateDnsEnabled: true,
    //   subnets: {
    //     subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
    //   },
    // })

    // // :: And this is the PrivateLink endpoint to the ECR repository API,
    // //    which is the actual endpoint we use when we're transferring data
    // //    during image pulls.
    // this.ecrRepositoryEndpoint = this.vpc.addInterfaceEndpoint('ecr-repo-endpoint', {
    //   service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
    //   privateDnsEnabled: true,
    //   subnets: {
    //     subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
    //   },
    // })

    // // :: The cluster will also need private connectivity to S3, as flat files
    // //    from ECR are ultimately stored in S3.
    // this.s3Endpoint = this.vpc.addGatewayEndpoint('s3-endpoint', {
    //   service: ec2.GatewayVpcEndpointAwsService.S3,
    //   subnets: [
    //     {
    //       subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
    //     },
    //   ],
    // })

    // // :: Finally, the cluster will also need access to Cloudwatch Logs,
    // //    to stream out logs as they are emitted.
    // this.cloudwatchEndpoint = this.vpc.addInterfaceEndpoint('cloudwatch-endpoint', {
    //   service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
    //   subnets: {
    //     subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
    //   },
    // })
  }
}

export default Network
