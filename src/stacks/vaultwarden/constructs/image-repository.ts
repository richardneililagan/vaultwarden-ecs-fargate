import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as ecrdeploy from 'cdk-ecr-deployment'

// :: ---

const BASE_IMAGE_NAME = 'vaultwarden/server'
const BASE_VERSION = process.env.VAULTWARDEN_BASE_VERSION || 'latest'

export type ImageRepositoryProps = {
  //
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
  image: ecrdeploy.DockerImageName

  constructor(scope: Construct, id: string, props?: ImageRepositoryProps) {
    super(scope, id)

    this.repository = new ecr.Repository(this, 'vaultwarden-image-repository', {
      repositoryName: BASE_IMAGE_NAME,
    })

    const officialImage = new ecrdeploy.DockerImageName(`vaultwarden/server:${BASE_VERSION}`)
    this.image = new ecrdeploy.DockerImageName(
      `${cdk.Aws.ACCOUNT_ID}.dkr.ecr.${cdk.Aws.REGION}.amazonaws.com/${BASE_IMAGE_NAME}:${BASE_VERSION}`
    )

    // :: Performs the duplication.
    new ecrdeploy.ECRDeployment(this, 'vaultwardenimage', {
      src: officialImage,
      dest: this.image,
    })
  }
}

export default ImageRepository
