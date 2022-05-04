import { Construct } from 'constructs'

// :: ---

export type NetworkProps = {}

class Network extends Construct {
  constructor(scope: Construct, id: string, props?: NetworkProps) {
    super(scope, id)
  }
}

export default Network
