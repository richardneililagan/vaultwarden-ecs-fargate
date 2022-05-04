import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as ecrdeploy from 'cdk-ecr-deployment'

// :: ---

export type ImageRepositoryProps = {
  imageName: string
  version: string
}

/**
 * This copies the official Vaultwarden container images from the Docker Hub registry
 * to a dedicated private registry in the AWS account. This prevents errors resulting
 * from running out of image pulls from the (shared) Docker Hub repository.
 *
 * Make sure to specify a specific version for the source image via environment variables.
 * @see `.env.sample`
 */
class ImageRepository extends Construct {
  repository: ecr.Repository

  constructor(scope: Construct, id: string, props: ImageRepositoryProps) {
    super(scope, id)

    this.repository = new ecr.Repository(this, 'vaultwarden-image-repository', {
      repositoryName: props.imageName,
    })

    const officialImage = new ecrdeploy.DockerImageName(`vaultwarden/server:${props.version}`)
    const targetImage = new ecrdeploy.DockerImageName(
      `${cdk.Aws.ACCOUNT_ID}.dkr.ecr.${cdk.Aws.REGION}.amazonaws.com/${props.imageName}:${props.version}`
    )

    // :: Performs the duplication.
    new ecrdeploy.ECRDeployment(this, 'vaultwardenimage', {
      src: officialImage,
      dest: targetImage,
    })
  }
}

export default ImageRepository
