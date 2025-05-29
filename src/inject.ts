import "./inject.css"
import { Editor, EDITORS } from "./types"
import { getOptions, debounce } from "./utils"

const run = async () => {
  const OPTIONS = await getOptions()

  function debug(...args: unknown[]) {
    // eslint-disable-next-line no-console
    if (OPTIONS.showDebugMessages) console.log.apply(null, ["[OPEN-IN-IDE EXTENSION]", ...args])
  }

  const EDITOR_OPENERS: {
    [e in Editor]: (repo: string, file: string, line?: string) => string
  } = {
    vscode: (repo: string, file: string, line?: string) => {
      const url = `vscode://file/${OPTIONS.localPathForRepositories}/${repo}/${file}:${line ?? "1"}`
      location.href = url
      return url
    },
    "vscode-wsl": (repo: string, file: string, line?: string) => {
      const url = `vscode://vscode-remote/wsl+Ubuntu/${OPTIONS.localPathForRepositories}/${repo}/${file}:${
        line ?? "1"
      }:1`
      location.href = url
      return url
    },
    vscodium: (repo: string, file: string, line?: string) => {
      const url = `vscodium://file/${OPTIONS.localPathForRepositories}/${repo}/${file}:${line ?? "1"}`
      location.href = url
      return url
    },
    "vscodium-wsl": (repo: string, file: string, line?: string) => {
      const url = `vscodium://vscode-remote/wsl+Ubuntu/${OPTIONS.localPathForRepositories}/${repo}/${file}:${
        line ?? "1"
      }:1`
      location.href = url
      return url
    },
    "vscode-insiders": (repo: string, file: string, line?: string) => {
      const url = `vscode-insiders://file/${OPTIONS.localPathForRepositories}/${repo}/${file}:${line ?? "1"}`
      location.href = url
      return url
    },
    "vscode-insiders-wsl": (repo: string, file: string, line?: string) => {
      const url = `vscode-insiders://vscode-remote/wsl+Ubuntu/${OPTIONS.localPathForRepositories}/${repo}/${file}:${
        line ?? "1"
      }:1`
      location.href = url
      return url
    },
    cursor: (repo: string, file: string, line?: string) => {
      const url = `cursor://file/${OPTIONS.localPathForRepositories}/${repo}/${file}:${line ?? "1"}`
      location.href = url
      return url
    },
    phpstorm: (repo: string, file: string, line?: string) => {
      const url = `phpstorm://open?file=${OPTIONS.localPathForRepositories}/${repo}/${file}&line=${line ?? "1"}`
      location.href = url
      return url
    },
    "intellij-idea": (repo: string, file: string, line?: string) => {
      const url = `idea://open?file=${OPTIONS.localPathForRepositories}/${repo}/${file}&line=${line ?? "1"}`
      location.href = url
      return url
    },
    webstorm: (repo: string, file: string, line?: string) => {
      const url = `webstorm://open?file=${OPTIONS.localPathForRepositories}/${repo}/${file}&line=${line ?? "1"}`
      location.href = url
      return url
    },
    goland: (repo: string, file: string, line?: string) => {
      const url = `goland://open?file=${OPTIONS.localPathForRepositories}/${repo}/${file}&line=${line ?? "1"}`
      location.href = url
      return url
    },
    clion: (repo: string, file: string, line?: string) => {
      const url = `clion://open?file=${OPTIONS.localPathForRepositories}/${repo}/${file}&line=${line ?? "1"}`
      location.href = url
      return url
    },
    "jetbrains-webserver": (repo: string, file: string, line?: string) => {
      const url = `http://localhost:63342/api/file?file=${OPTIONS.localPathForRepositories}/${repo}/${file}&line=${
        line ?? "1"
      }`
      fetch(url).catch(() => alert(`Unable to open the file.\nIs the built-in web server started on localhost:63342 ?`))
      return url
    },
  }

  const generateIconElement = (repo: string, file: string, lineNumber?: string | null) => {
    const editorIconSpanElement = document.createElement("span")
    const filename = file.split("/").pop() as string
    let iconTitle = `Open ${filename} in ${EDITORS[OPTIONS.defaultIde].name}`
    if (lineNumber) iconTitle = `${iconTitle} at line ${lineNumber}`
    editorIconSpanElement.title = iconTitle
    editorIconSpanElement.classList.add("open-in-ide-icon")

    const editorIconImgElement = document.createElement("img")
    editorIconImgElement.src = chrome.runtime.getURL(EDITORS[OPTIONS.defaultIde].getIcon(32))
    editorIconSpanElement.appendChild(editorIconImgElement)

    editorIconSpanElement.addEventListener("click", e => {
      e.preventDefault()
      const editorUrl = EDITOR_OPENERS[OPTIONS.defaultIde](repo, file, lineNumber ?? undefined)
      debug(`Opened ${editorUrl}`)
    })
    return editorIconSpanElement
  }

  const filePathRegExp = /.+\/([^/]+)\/(blob|tree)\/[^/]+\/(.*)/

  const addEditorIcons = () => {
    debug("Adding editor icons")

    let addedIconsCounter = 0

    // -------------------------------
    // repository content (files list)
    // -------------------------------

    if (OPTIONS.showIconInFileTree) {
      const files = document.querySelectorAll(
        '[aria-labelledby="files"].js-navigation-container > .Box-row.js-navigation-item .css-truncate',
      )

      files.forEach(fileElement => {
        // don't add a new icon if icon already exists
        if (fileElement.parentNode?.querySelector(".open-in-ide-icon")) return

        const fileUrl = fileElement.querySelector("a")?.getAttribute("href")
        if (!fileUrl || !filePathRegExp.test(fileUrl)) return

        const pathInfo = filePathRegExp.exec(fileUrl)
        const repo = pathInfo?.[1]
        const file = pathInfo?.[3]
        if (!repo || !file) return

        const editorIconElement = generateIconElement(repo, file)
        editorIconElement.classList.add("open-in-ide-icon-file-explorer")

        fileElement.parentNode?.insertBefore(editorIconElement, fileElement.nextSibling)
        addedIconsCounter++
      })
    }

    // -------------------------------
    // file header (individual file view)
    // -------------------------------
    
    if (OPTIONS.showIconOnFileBlockHeaders) {
      // Try to find the specific button container from the provided selector
      const targetButton = document.querySelector('#StickyHeader > div > div > div[class*="CodeViewHeader"] > div > button')
      
      if (targetButton && !targetButton.parentElement?.querySelector('.open-in-ide-icon')) {
        const currentUrl = window.location.href.split('#')[0] // Remove hash for matching
        const fileMatch = currentUrl.match(filePathRegExp)
        
        debug(`Target button found, URL: ${currentUrl}`)
        debug(`RegExp match:`, fileMatch)
        
        if (fileMatch) {
          const repo = fileMatch[1]
          const file = fileMatch[3]
          
          // Get line number from URL hash if present
          const lineMatch = window.location.hash.match(/^#L(\d+)/)
          const lineNumber = lineMatch ? lineMatch[1] : undefined
          
          debug(`Adding icon for repo: ${repo}, file: ${file}, line: ${lineNumber}`)
          
          const editorIconElement = generateIconElement(repo, file, lineNumber)
          editorIconElement.classList.add("open-in-ide-icon-file-header")
          editorIconElement.style.marginLeft = "8px"
          editorIconElement.style.display = "inline-block"
          
          // Insert the icon next to the target button
          targetButton.parentElement?.insertBefore(editorIconElement, targetButton.nextSibling)
          addedIconsCounter++
        } else {
          debug(`No match for URL: ${currentUrl}`)
        }
      } else {
        debug(`Target button not found or icon already exists`)
        
        // Fallback to original logic if specific selector doesn't work
        let fileHeader = document.querySelector('[data-testid="breadcrumb"]')?.closest('.Box-header')
        
        if (!fileHeader) {
          // Alternative selectors for file header
          fileHeader = document.querySelector('.file-header')
          if (!fileHeader) {
            fileHeader = document.querySelector('.Box-header.file-header')
          }
          if (!fileHeader) {
            fileHeader = document.querySelector('.js-file-header')
          }
          if (!fileHeader) {
            // Look for any Box-header that contains breadcrumb or file path
            const headers = document.querySelectorAll('.Box-header')
            for (const header of headers) {
              if (header.querySelector('[data-testid="breadcrumb"]') || header.textContent?.includes('/')) {
                fileHeader = header
                break
              }
            }
          }
        }
        
        if (fileHeader && !fileHeader.querySelector('.open-in-ide-icon')) {
          const currentUrl = window.location.href.split('#')[0] // Remove hash for matching
          const fileMatch = currentUrl.match(filePathRegExp)
          
          debug(`Fallback: File header found, URL: ${currentUrl}`)
          debug(`Fallback: RegExp match:`, fileMatch)
          
          if (fileMatch) {
            const repo = fileMatch[1]
            const file = fileMatch[3]
            
            // Get line number from URL hash if present
            const lineMatch = window.location.hash.match(/^#L(\d+)/)
            const lineNumber = lineMatch ? lineMatch[1] : undefined
            
            debug(`Fallback: Adding icon for repo: ${repo}, file: ${file}, line: ${lineNumber}`)
            
            const editorIconElement = generateIconElement(repo, file, lineNumber)
            editorIconElement.classList.add("open-in-ide-icon-file-header")
            editorIconElement.style.marginLeft = "8px"
            editorIconElement.style.display = "inline-block"
            
            // Insert the icon at the end of the header
            fileHeader.appendChild(editorIconElement)
            addedIconsCounter++
          }
        }
      }
    }

    // --------------------------------------------
    // file links (files changed view & discussions)
    // --------------------------------------------

    if (OPTIONS.showIconOnFileBlockHeaders || OPTIONS.showIconOnLineNumbers) {
      let inFilesChangedView = true

      // select file blocks
      let primaryLinks = document.querySelectorAll<HTMLAnchorElement>(".file a.Link--primary[title]") // in files changed view

      if (!primaryLinks.length) {
        primaryLinks = document.querySelectorAll<HTMLAnchorElement>(".js-comment-container a.Link--primary.text-mono") // in discussion
        inFilesChangedView = false
      }

      const repo = window.location.href.split("/")[4]

      primaryLinks.forEach(linkElement => {
        const file = linkElement.innerText
          .split("→") // when file was renamed
          .pop()
          ?.trim()

        // no file found
        if (!file) return

        let lineNumberForFileBlock

        const fileElement = linkElement.closest(inFilesChangedView ? ".file" : ".js-comment-container")

        if (fileElement) {
          if (!inFilesChangedView) {
            // in discussion
            const lineNumberNodes = fileElement.querySelectorAll("td[data-line-number]")

            if (lineNumberNodes.length === 0) return // length can be equal to zero in case of resolved comment for example

            // get last line number
            lineNumberForFileBlock = lineNumberNodes[lineNumberNodes.length - 1].getAttribute("data-line-number")
          } else {
            const firstLineNumberNode = fileElement.querySelector(
              "td.blob-num-deletion[data-line-number], td.blob-num-addition[data-line-number]",
            )
            // get first line number
            lineNumberForFileBlock = firstLineNumberNode?.getAttribute("data-line-number")
          }
        } else {
          // no line number available
        }

        if (
          OPTIONS.showIconOnFileBlockHeaders &&
          // don't add a new icon if icon already exists
          !linkElement.parentNode?.querySelector(".open-in-ide-icon")
        ) {
          const editorIconElement = generateIconElement(repo, file, lineNumberForFileBlock)

          linkElement.parentNode?.insertBefore(editorIconElement, null)
          addedIconsCounter++
        }

        // add icon on each line number
        if (OPTIONS.showIconOnLineNumbers && fileElement) {
          const clickableLineNumbersNodes = fileElement.querySelectorAll("td.blob-num[data-line-number]")

          clickableLineNumbersNodes.forEach(lineNumberNode => {
            // don't add a new icon if icon already exists
            if (lineNumberNode.querySelector(".open-in-ide-icon")) return

            const lineNumber = lineNumberNode.getAttribute("data-line-number")

            const editorIconElement = generateIconElement(repo, file, lineNumber)

            lineNumberNode.classList.add("js-open-in-ide-icon-added")
            lineNumberNode.appendChild(editorIconElement)
            addedIconsCounter++
          })
        }
      })
    }

    debug(`Added ${addedIconsCounter} new editor icons`)
  }

  // observe content changes
  const observeChanges = () => {
    debug("Observing page changes")

    const content = document.querySelector(".repository-content")

    if (content)
      pageChangeObserver.observe(content, {
        childList: true,
        subtree: true,
      })
  }

  // inject CSS rules for GitHub elements
  const styleNode = document.createElement("style")

  if (OPTIONS.showIconOnLineNumbers)
    // hide file numbers on hover
    styleNode.innerHTML += `tr:hover > td.js-open-in-ide-icon-added::before {
      display: none;
    }`

  document.head.appendChild(styleNode)

  // set up an observer
  const pageChangeObserver = new MutationObserver(function (mutations) {
    mutations.forEach(
      debounce(function (mutation: MutationRecord) {
        // prevent recursive mutation observation
        if ((mutation.target as Element).querySelector(":scope > .open-in-ide-icon")) return
        debug("Detected page changes:")
        debug(mutation.target)
        addEditorIcons()
        observeChanges()
      }),
    )
  })

  addEditorIcons()
  observeChanges()

  // observe route change
  pageChangeObserver.observe(document.head, {
    childList: true,
  })
}

void run()
