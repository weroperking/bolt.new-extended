import React, { memo, useEffect, useState } from 'react';
import { Dialog, DialogButton, DialogDescription, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import * as Select from '@radix-ui/react-select';
import { deployTo, getDeployer, getDeployers } from '~/utils/deployOptions';
import { SelectPortal } from '@radix-ui/react-select';
import { useLocalStorage } from 'usehooks-ts';
import { toast } from 'react-toastify';
import { useLoaderData } from '@remix-run/react';

export const DeployButton = memo(() => {
  const { id: mixedId } = useLoaderData<{ id?: string }>();

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
  const [chatDeployers, setChatDeployers] = useLocalStorage<
    Record<string, {
      deployers: Record<string, {
        platform: string;
        currentStep: number;
        stepInputs: Record<string, string>;
      }>;
      selectedDeployer: string | null;
    }>
  >('chat-deployers', {});


  const updateChatDeployer = (chatID: string, deployerID: string, updates: Partial<{
    platform: string;
    currentStep: number;
    stepInputs: Record<string, string>;
  }>) => {
    setChatDeployers(prev => {
      const currentChat = prev[chatID] || { deployers: {}, selectedDeployer: null };
      const existingSteps = currentChat.deployers[deployerID]?.stepInputs;
      const oldName = existingSteps?.["name"];
      const newName = updates.stepInputs?.["name"];

      if (oldName && newName && newName !== oldName) {
        updates.stepInputs = {
          ...updates.stepInputs,
          oldName: oldName
        };
      }

      return {
        ...prev,
        [chatID]: {
          deployers: {
            ...currentChat.deployers,
            [deployerID]: {
              ...currentChat.deployers[deployerID],
              ...updates,
            }
          },
          selectedDeployer: deployerID
        }
      };
    });
  };



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
        //set chat deployer with id
        updateChatDeployer(mixedId, selectedPlatform, {
          platform: selectedPlatform,
          currentStep,
          stepInputs,
        })
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
      const chatDeployer = chatDeployers[mixedId || 'default'];
      const selectedDeployer = chatDeployer?.deployers[selectedPlatform];
      if (chatDeployer && selectedDeployer) {
        setSelectedPlatform(selectedDeployer.platform);
        setCurrentStep(selectedDeployer.currentStep);
        setStepInputs(selectedDeployer.stepInputs);
      } else {
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
    }
  }, [selectedPlatform]);

  return (
    <>
      <button
        className="rounded-md text-xs px-4 py-2 bg-bolt-elements-item-backgroundAccent text-bolt-elements-button-secondary-text flex gap-1.7 items-center justify-center px-3 py-1.5 hover:text-bolt-elements-button-secondary-textHover hover:bg-bolt-elements-button-secondary-backgroundHover"
        onClick={() => setModalOpen(true)}
      >
        <div className="i-ph:rocket-launch text-lg" />
        Deploy
      </button>

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
    </>
  );
});
