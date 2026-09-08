import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { hasPublicFactoryBrainScope } from "../util/factoryBrain"

const Body: QuartzComponent = ({ children, allFiles }: QuartzComponentProps) => {
  return (
    <>
      <a class="skip-to-content" href="#quartz-main">
        Skip to content
      </a>
      <div
        id="quartz-body"
        data-ui-pass="factory-brain-workspace"
        data-content-scope={hasPublicFactoryBrainScope(allFiles) ? "public-content" : undefined}
      >
        {children}
      </div>
    </>
  )
}

export default (() => Body) satisfies QuartzComponentConstructor
