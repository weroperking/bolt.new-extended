import { useStore } from '@nanostores/react';
import { motion, type HTMLMotionProps, type Variants } from 'framer-motion';
import { computed } from 'nanostores';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  type OnChangeCallback as OnEditorChange,
  type OnScrollCallback as OnEditorScroll,
} from '~/components/editor/codemirror/CodeMirrorEditor';
import { IconButton } from '~/components/ui/IconButton';
import { PanelHeaderButton } from '~/components/ui/PanelHeaderButton';
import { Slider, type SliderOptions } from '~/components/ui/Slider';
import { workbenchStore, type WorkbenchViewType } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { renderLogger } from '~/utils/logger';
import { EditorPanel } from './EditorPanel';
import { Preview } from './Preview';
import { Dialog, DialogButton, DialogDescription, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import * as Select from "@radix-ui/react-select";
import {
  deployTo,
  getDeployer,
  getDeployers
} from '~/utils/deployOptions';
import { SelectPortal } from '@radix-ui/react-select';
import { useLoaderData } from '@remix-run/react';

interface WorkspaceProps {
  chatStarted?: boolean;
  isStreaming?: boolean;
}

const viewTransition = { ease: cubicEasingFn };

const sliderOptions: SliderOptions<WorkbenchViewType> = {
  left: {
    value: 'code',
    text: 'Code',
  },
  right: {
    value: 'preview',
    text: 'Preview',
  },
};

const workbenchVariants = {
  closed: {
    width: 0,
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
  open: {
    width: 'var(--workbench-width)',
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
} satisfies Variants;

export const Workbench = memo(({ chatStarted, isStreaming }: WorkspaceProps) => {
  renderLogger.trace('Workbench');

  const hasPreview = useStore(computed(workbenchStore.previews, (previews) => previews.length > 0));
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const selectedFile = useStore(workbenchStore.selectedFile);
  const currentDocument = useStore(workbenchStore.currentDocument);
  const unsavedFiles = useStore(workbenchStore.unsavedFiles);
  const files = useStore(workbenchStore.files);
  const selectedView = useStore(workbenchStore.currentView);

  const setSelectedView = (view: WorkbenchViewType) => {
    workbenchStore.currentView.set(view);
  };

  useEffect(() => {
    if (hasPreview) {
      setSelectedView('preview');
    }
  }, [hasPreview]);

  useEffect(() => {
    workbenchStore.setDocuments(files);
  }, [files]);

  const onEditorChange = useCallback<OnEditorChange>((update) => {
    workbenchStore.setCurrentDocumentContent(update.content);
  }, []);

  const onEditorScroll = useCallback<OnEditorScroll>((position) => {
    workbenchStore.setCurrentDocumentScrollPosition(position);
  }, []);

  const onFileSelect = useCallback((filePath: string | undefined) => {
    workbenchStore.setSelectedFile(filePath);
  }, []);

  const onFileSave = useCallback(() => {
    workbenchStore.saveCurrentDocument().catch(() => {
      toast.error('Failed to update file content');
    });
  }, []);

  const onFileReset = useCallback(() => {
    workbenchStore.resetCurrentDocument();
  }, []);

  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("github");
  const [currentStep, setCurrentStep] = useState(0);
  const [stepInputs, setStepInputs] = useState<Record<string, string>>({});
  const [isDeploying, setIsDeploying] = useState(false);

  const resetDeployState = () => {
    setCurrentStep(0);
    setStepInputs({});
    setIsDeploying(false);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    resetDeployState();
  };

  const handlePlatformChange = (platform: string) => {
    setSelectedPlatform(platform);
    resetDeployState();
  };

  const handleInputChange = (name: string, value: string) => {
    setStepInputs(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStepSubmit = async () => {
    const deployer = getDeployer(selectedPlatform);
    if (!deployer) return;

    if (deployer.steps) {
      const currentStepData = deployer.steps[currentStep];
      if (currentStepData.validate) {
        try {
          const validationResult = await currentStepData.validate(stepInputs);
          if (!validationResult.isValid) {
            toast.error(validationResult.error || 'Validation failed');
            return;
          } else if (validationResult.warning) {
            toast.warn(validationResult.warning);
          }
        } catch (error) {
          toast.error('Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
          return;
        }
      }

      if (currentStep < deployer.steps.length - 1) {
        setCurrentStep(currentStep + 1);
        return;
      }
    }

    handleDeploy();
  };

  const { id: mixedId } = useLoaderData<{ id?: string }>();
  const handleDeploy = async () => {
    setIsDeploying(true);
    if (!mixedId) {
      toast.error('Failed to deploy: Missing project ID');
      setIsDeploying(false);
      return;
    }
    toast.info('Starting deployment...');

    try {
      const response = await deployTo(selectedPlatform, stepInputs, mixedId);

      if (response.status === 'success') {
        toast.success('Deployed successfully');
        if (response.redirectUrl) {
          window.open(response.redirectUrl, '_blank');
        }
        handleModalClose();
      } else {
        toast.error(response.reason);
      }
    } catch (error) {
      toast.error('Deployment failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsDeploying(false);
    }
  };

  useEffect(() => {
    if (!selectedPlatform) return;
    const deployer = getDeployer(selectedPlatform);
    if (deployer && deployer.steps) {
      const initialInputs = deployer.steps.reduce((acc: any, step) => {
        step.inputs.forEach(input => {
          if (input.defaultValue) {
            acc[input.name] = input.defaultValue;
          }
        });
        return acc;
      }, {});
      setStepInputs(initialInputs);
    }
  }, [selectedPlatform]);

  return (
    chatStarted && (
      <motion.div
        initial="closed"
        animate={showWorkbench ? 'open' : 'closed'}
        variants={workbenchVariants}
        className="z-workbench"
      >
        <div
          className={classNames(
            'fixed top-[calc(var(--header-height)+1.5rem)] bottom-6 w-[var(--workbench-inner-width)] mr-4 z-0 transition-[left,width] duration-200 bolt-ease-cubic-bezier',
            {
              'left-[var(--workbench-left)]': showWorkbench,
              'left-[100%]': !showWorkbench,
            },
          )}
        >
          <div className="absolute inset-0 px-6">
            <div className="h-full flex flex-col bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor shadow-sm rounded-lg overflow-hidden">
              <div className="flex items-center px-3 py-2 border-b border-bolt-elements-borderColor">
                <Slider selected={selectedView} options={sliderOptions} setSelected={setSelectedView} />
                <div className="ml-auto" />
                {selectedView === 'code' && (
                  <>
                    <PanelHeaderButton className="mr-1 text-sm" onClick={() => setModalOpen(true)}>
                      <div className="i-ph:paper-plane-tilt" />
                      Deploy
                    </PanelHeaderButton>
                    <PanelHeaderButton
                      className="mr-1 text-sm"
                      onClick={() => {
                        workbenchStore.toggleTerminal(!workbenchStore.showTerminal.get());
                      }}
                    >
                      <div className="i-ph:terminal" />
                      Toggle Terminal
                    </PanelHeaderButton>
                  </>
                )}
                <IconButton
                  icon="i-ph:x-circle"
                  className="-mr-1"
                  size="xl"
                  onClick={() => {
                    workbenchStore.showWorkbench.set(false);
                  }}
                />
              </div>
              <div className="relative flex-1 overflow-hidden">
                <View
                  initial={{ x: selectedView === 'code' ? 0 : '-100%' }}
                  animate={{ x: selectedView === 'code' ? 0 : '-100%' }}
                >
                  <EditorPanel
                    editorDocument={currentDocument}
                    isStreaming={isStreaming}
                    selectedFile={selectedFile}
                    files={files}
                    unsavedFiles={unsavedFiles}
                    onFileSelect={onFileSelect}
                    onEditorScroll={onEditorScroll}
                    onEditorChange={onEditorChange}
                    onFileSave={onFileSave}
                    onFileReset={onFileReset}
                  />
                </View>
                <View
                  initial={{ x: selectedView === 'preview' ? 0 : '100%' }}
                  animate={{ x: selectedView === 'preview' ? 0 : '100%' }}
                >
                  <Preview />
                </View>
              </div>
            </div>
          </div>
        </div>

        <DialogRoot open={isModalOpen}  onOpenChange={setModalOpen}>
          <Dialog>
            <DialogTitle>Deploy Options</DialogTitle>
            <DialogDescription>
              <label>
                <Select.Root
                  value={selectedPlatform}
                  onValueChange={(value) => handlePlatformChange(value)}
                >
                  <Select.Trigger
                    className="inline-flex items-center justify-center gap-1 px-2 py-1 text-sm rounded bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary w-full">
                    <Select.Value>
                      {selectedPlatform && getDeployer(selectedPlatform)?.name || 'Select Platform'}
                    </Select.Value>
                  </Select.Trigger>
                  <SelectPortal>
                    <Select.Content
                      position={"popper"}
                      side={"bottom"}
                      sideOffset={5}
                      className="z-[1000] overflow-hidden bg-bolt-elements-background-depth-1 rounded-md border border-bolt-elements-borderColor shadow-md w-[var(--radix-select-trigger-width)] min-w-[220px] max-h-50vh">

                      <Select.Viewport className="p-2">
                        {getDeployers().map((value) => (
                          <Select.Item
                            key={value.key}
                            value={value.key}
                            disabled={!value.active}
                            className="relative flex items-center px-6 py-2 text-sm text-bolt-elements-textPrimary rounded select-none
                              hover:bg-bolt-elements-item-backgroundAccent
                              data-[disabled]:opacity-50
                              data-[disabled]:pointer-events-none
                              data-[highlighted]:bg-bolt-elements-item-backgroundAccent
                              data-[highlighted]:outline-none
                              cursor-default
                              focus:outline-none"
                          >
                            <Select.ItemText>{value.name}</Select.ItemText>
                            <Select.ItemIndicator>
                              <span className={value.icon} />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </SelectPortal>
                </Select.Root>
              </label>
              <br/>
              {selectedPlatform && (
                <div className="mt-4">
                  {(() => {
                    const deployer = getDeployer(selectedPlatform);
                    if (!deployer) return null;

                    if (deployer.steps) {
                      const currentStepData = deployer.steps[currentStep];
                      return (
                        <>
                          <h3 className="text-lg font-medium mb-4">{currentStepData.title}</h3>
                          {currentStepData.inputs.map((input, index) => (
                            <label key={index} className="block mt-4">
                              <span className="text-bolt-elements-textPrimary text-sm">{input.name}</span>
                              <input
                                type={input.type}
                                name={input.name}
                                placeholder={input.placeholder}
                                required={input.required}
                                value={input.type !== 'checkbox' ? (stepInputs[input.name] !== undefined ? stepInputs[input.name] : '') : undefined}
                                checked={input.type === 'checkbox' ? (stepInputs[input.name] !== undefined && stepInputs[input.name] === 'true') : undefined}
                                onChange={(e) => handleInputChange(input.name, input.type === 'checkbox' ? e.target.checked.toString() : e.target.value)}
                                className="w-full mt-1 px-2 py-1 rounded-md border border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary"
                              />
                              {input.description && (
                                <p className="text-xs text-bolt-elements-textSecondary mt-1" dangerouslySetInnerHTML={{ __html: input.description }} />
                              )}
                            </label>
                          ))}
                        </>
                      );
                    }
                  })()}
                </div>
              )}
            </DialogDescription>
            <div className="px-5 pb-4 bg-bolt-elements-background-depth-2 flex gap-2 justify-end">
              <DialogButton
                type="secondary"
                onClick={handleModalClose}
                disabled={isDeploying}
              >
                Cancel
              </DialogButton>

              {getDeployer(selectedPlatform)?.steps && currentStep > 0 && (
                <DialogButton
                  type="secondary"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  disabled={isDeploying}
                >
                  Back
                </DialogButton>
              )}

              <DialogButton
                type="primary"
                disabled={!selectedPlatform || isDeploying}
                onClick={handleStepSubmit}
              >
                {isDeploying ? (
                  <span className="flex items-center gap-2">
                    <span className="i-ph:spinner animate-spin" />
                    Deploying...
                  </span>
                ) : getDeployer(selectedPlatform)?.steps
                  ? currentStep < (getDeployer(selectedPlatform)?.steps?.length || 0) - 1
                    ? 'Next'
                    : 'Deploy'
                  : 'Deploy'}
              </DialogButton>
            </div>
          </Dialog>
        </DialogRoot>
      </motion.div>
    )
  );
});

interface ViewProps extends HTMLMotionProps<'div'> {
  children: JSX.Element;
}

const View = memo(({ children, ...props }: ViewProps) => {
  return (
    <motion.div className="absolute inset-0" transition={viewTransition} {...props}>
      {children}
    </motion.div>
  );
});
