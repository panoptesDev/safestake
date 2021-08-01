import 'react-virtualized/styles.css';
import AutoSizer from 'react-virtualized/dist/commonjs/AutoSizer';
import React, { useContext, useEffect, useState } from "react";
import { sendTransaction, useSendConnection, useSafecoinExplorerUrlSuffix } from "../contexts/connection";
import { LAMPORTS_PER_PANO, PublicKey, StakeProgram, ValidatorInfo, VoteAccountInfo } from "@panoptis/web3.js";
import { Button, Typography, Dialog, DialogActions, DialogContent, DialogTitle, Slider, TextField, Link, Box, CircularProgress, InputAdornment } from '@material-ui/core';
import { useWallet } from '../contexts/wallet';
import { useMonitorTransaction } from '../utils/notifications';
import { formatPct, formatPriceNumber, shortenAddress, sleep } from '../utils/utils';
import { Column, Table, TableHeaderProps, TableCellProps } from 'react-virtualized';
import { defaultRowRenderer } from 'react-virtualized/dist/es/Table';
import { ValidatorScore } from '../utils/validatorsApp';
import { ValidatorScoreTray } from './ValidatorScoreTray';
import { ValidatorsContext } from '../contexts/validators';
import { useAsyncAbortable } from 'react-async-hook';
import { useParams } from 'react-router-dom';

const IMG_SRC_DEFAULT = 'placeholder-questionmark.png';

function basicCellRenderer(props: TableCellProps) {
  return (
    <Typography>
      {props.cellData}
    </Typography>
  );
}

function basicHeaderRenderer(props: TableHeaderProps) {
  return (
    <Typography>
      {props.label}
    </Typography>
  );
}

function scoreCellRenderer(props: TableCellProps) {
  return props.cellData ? 
    <ValidatorScoreTray validatorScore={props.cellData} />
    : "N.A.";
}

interface ValidatorMeta {
  voteAccountInfo: VoteAccountInfo;
  validatorInfo: ValidatorInfo | undefined;
  validatorScore: ValidatorScore | undefined;
};

const BATCH_SIZE = 100;

async function batchMatcher(
  voteAccountStatus: VoteAccountInfo[],
  validatorInfos: ValidatorInfo[],
  validatorScores: ValidatorScore[],
  onValidatorMetas: (metas: ValidatorMeta[]) => void,
  abortSignal: AbortSignal
  ) {
  let validatorMetas: ValidatorMeta[] = [];
  let remainingVoteAccountInfos = [...voteAccountStatus];
  let remainingValidatorInfos = [...validatorInfos];

  console.log('scores', validatorScores.length)

  for(let i = 0; i < validatorScores.length; i++) {
    const validatorScore = validatorScores[i];
    const voteAccountIndex = remainingVoteAccountInfos.findIndex(info => info.nodePubkey === validatorScore.account);
    if (voteAccountIndex < 0) {
      // If score does not match anything then it goes into the no score bucket
      continue;
    }
    const [voteAccountInfo] = remainingVoteAccountInfos.splice(voteAccountIndex, 1);

    const validatorInfoIndex = remainingValidatorInfos.findIndex(validatorInfo => validatorInfo.key.equals(new PublicKey(voteAccountInfo.nodePubkey)));
    let validatorInfo: ValidatorInfo | undefined;
    [validatorInfo] = validatorInfoIndex > -1 ? remainingValidatorInfos.splice(validatorInfoIndex, 1) : [];

    validatorMetas.push({
      voteAccountInfo,
      validatorInfo,
      validatorScore,
    });

    if (i % BATCH_SIZE === 0) {
      await sleep(1);
      console.log(`batch index: ${i}`);
      onValidatorMetas([...validatorMetas]);
    }

    if (abortSignal.aborted) {
      return;
    }
  }

  for(let i = 0; i < remainingVoteAccountInfos.length; i++) {
    const voteAccountInfo = remainingVoteAccountInfos[i];

    const validatorInfoIndex = remainingValidatorInfos.findIndex(validatorInfo => validatorInfo.key.equals(new PublicKey(voteAccountInfo.nodePubkey)));
    let validatorInfo: ValidatorInfo | undefined;
    [validatorInfo] = validatorInfoIndex > -1 ? remainingValidatorInfos.splice(validatorInfoIndex, 1) : [];

    validatorMetas.push({
      voteAccountInfo,
      validatorInfo,
      validatorScore: undefined,
    });

    if (i % BATCH_SIZE === 0) {
      await sleep(1);
      console.log(`batch index: ${i}`);
      onValidatorMetas([...validatorMetas]);
    }

    if (abortSignal.aborted) {
      return;
    }
  }
  return validatorMetas;
}

export function DelegateDialog(props: {stakePubkey: PublicKey, open: boolean, handleClose: () => void}) {
  const {stakePubkey, open, handleClose} = props;
  const sendConnection = useSendConnection();
  const {wallet} = useWallet();
  const {monitorTransaction, sending} = useMonitorTransaction();
  const urlSuffix = useSafecoinExplorerUrlSuffix();
  
  const [maxComission, setMaxComission] = useState<number>(100);

  const { voteAccountInfos, validatorInfos, validatorScores, totalActivatedStake} = useContext(ValidatorsContext);

  const [validatorMetas, setValidatorMetas] = useState<ValidatorMeta[]>([]);
  const [filteredValidatorMetas, setFilteredValidatorMetas] = useState<ValidatorMeta[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>();
  const { validator } = useParams() as any;
  const [searchCriteria, setSearchCriteria] = useState<string>('');

  // Batched validator meta building
  // Order is VoteAccountInfo[] order, until validatorScores is available
  // VoteAccountInfo with no available score go at the bottom of the list
  useAsyncAbortable(async (abortSignal) => {
    const validatorMetas = await batchMatcher(
      voteAccountInfos,
      validatorInfos,
      validatorScores,
      (validatorMetas) => setValidatorMetas(validatorMetas),
      abortSignal
    );
    if (validatorMetas) {
      setValidatorMetas(validatorMetas);
    }
  }, [voteAccountInfos, validatorInfos, validatorScores]);

  useEffect(() => {
    if(validator) {
      setSearchCriteria(validator);
      setSelectedIndex(0);
    }
  }, [validator])

  useEffect(() => {
    setSelectedIndex(undefined);
    setFilteredValidatorMetas(validatorMetas.filter(meta => {
      const votePubkeyMatches = searchCriteria ? meta.voteAccountInfo.votePubkey.includes(searchCriteria) : true;
      const nameMatches = searchCriteria ? meta.validatorInfo?.info.name.toLowerCase().includes(searchCriteria.toLowerCase()) : true;

      return (meta.voteAccountInfo.commission <= maxComission) && (votePubkeyMatches || nameMatches);
    }));
  }, [validatorMetas, maxComission, searchCriteria]);

  useEffect(() => {
    if(selectedIndex !== undefined && selectedIndex >= filteredValidatorMetas.length) {
      setSelectedIndex(undefined);
    }
  }, [filteredValidatorMetas, selectedIndex]);

  return (
    <Dialog
      open={open}
      fullWidth={true}
      onClose={handleClose}
      maxWidth="lg"
    >
      <DialogTitle>
        Choose a validator
      </DialogTitle>
      <DialogContent>
        <div>
          <Typography>
            Max commission %
          </Typography>
          <Slider
            color="secondary"
            style={{width: '20%'}}
            value={maxComission}
            onChange={(event, newValue) => {setMaxComission(newValue as number)}}
            aria-labelledby="continuous-slider"
            step={1}
            valueLabelDisplay="auto"
          />
          <Typography>
            The top 200 validators in terms of APY offer between 7.0 and 8.1% APY (even with fees)
          </Typography>
        </div>

        <TextField
          title="Search"
          fullWidth
          placeholder="Name or vote account"
          value={searchCriteria}
          onChange={(e) => {
            setSearchCriteria(e.target.value);
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Button
                  onClick={() =>
                    setSearchCriteria('')
                  }
                >
                  Clear
                </Button>
              </InputAdornment>
            ),
            inputProps: {
              step: 0.1,
            },
          }}
        />

        <Box m={2} />

        <div style={{height: '60vh'}}>
          <AutoSizer>
            {({height, width}) => (
              <Table
                width={width}
                height={height}
                headerHeight={20}
                rowHeight={70}
                rowCount={filteredValidatorMetas.length}
                rowGetter={({index}) => {
                  return filteredValidatorMetas[index];
                }}
                onRowClick={({index}) => { setSelectedIndex(index) }}
                rowRenderer={props => {
                  const className = props.index === selectedIndex ? ' clickedItem': ' item';
                  return defaultRowRenderer({...props, className: props.className + className});
                }}
              >
                <Column
                  dataKey="validatorInfo"
                  width={80}
                  cellDataGetter={({rowData}) => rowData.validatorInfo?.info?.keybaseUsername ?
                    `https://keybase.io/${rowData.validatorInfo?.info?.keybaseUsername}/picture`
                    : IMG_SRC_DEFAULT
                  }
                  cellRenderer={(props: TableCellProps) => (
                    <img
                      height="60px"
                      src={props.cellData as string}
                      alt=""
                    />)
                  }
                />
                <Column
                  label="name or account"
                  dataKey="name"
                  width={240}
                  headerRenderer={basicHeaderRenderer}
                  cellDataGetter={({rowData}) => ({votePubkey: rowData.voteAccountInfo.votePubkey, name: rowData.validatorInfo?.info?.name})}
                  cellRenderer={(props: TableCellProps) => {
                    return (
                      <div>
                        <Typography>
                          <Link color="secondary" href={`https://explorer.safecoin.org/address/${props.cellData.votePubkey}${urlSuffix}`} rel="noopener noreferrer" target="_blank">
                            {props.cellData.name ? props.cellData.name : shortenAddress(props.cellData.votePubkey, 6)}
                          </Link>
                        </Typography>
                      </div>
                    );
                  }}
                />
                <Column
                  label="Stake (PANO)"
                  dataKey="activatedStake"
                  headerRenderer={basicHeaderRenderer} cellRenderer={basicCellRenderer}
                  cellDataGetter={({rowData}) => `${formatPriceNumber.format(rowData.voteAccountInfo.activatedStake / LAMPORTS_PER_PANO)} (${formatPct.format(rowData.voteAccountInfo.activatedStake / totalActivatedStake)})`}
                  width={180}
                />
                <Column
                  label="Fee"
                  dataKey="commission"
                  headerRenderer={basicHeaderRenderer}
                  cellDataGetter={({rowData}) => `${rowData.voteAccountInfo.commission}%`}
                  cellRenderer={basicCellRenderer}
                  width={80}
                />
                <Column
                  label="Website"
                  dataKey="website"
                  headerRenderer={basicHeaderRenderer}
                  cellDataGetter={({rowData}) => rowData.validatorInfo?.info?.website}
                  cellRenderer={(props: TableCellProps) => {
                    return (
                      <Typography>
                        <Link color="secondary" href={props.cellData} rel="noopener noreferrer" target="_blank">
                          {props.cellData}
                        </Link>
                      </Typography>
                    );
                  }}
                  width={300}
                />
                <Column
                  label="Score"
                  dataKey="validatorScore"
                  headerRenderer={() => (
                    <Typography>
                      Score (Max 11)
                      <Link href="https://validators.app/faq" rel="noopener noreferrer" target="_blank">
                        <img height="15px" src="va-logo.png" alt="" style={{verticalAlign: "middle"}}/>
                      </Link>
                    </Typography>
                  )}
                  cellDataGetter={({rowData}) => rowData.validatorScore}
                  cellRenderer={scoreCellRenderer}
                  width={200}
                />
              </Table>
            )}
          </AutoSizer>
        </div>

        <Box m={2}>
          {(selectedIndex !== undefined && filteredValidatorMetas[selectedIndex]) && (
            <Typography variant="h6">
              Selected {shortenAddress(filteredValidatorMetas[selectedIndex].voteAccountInfo.votePubkey)}
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <Button
          disabled={selectedIndex === undefined || sending}
          onClick={async () => {
            if(!wallet?.publicKey || selectedIndex === undefined || !filteredValidatorMetas[selectedIndex]) {
              return;
            }

            const transaction = StakeProgram.delegate({
              stakePubkey,
              authorizedPubkey: wallet.publicKey,
              votePubkey: new PublicKey(filteredValidatorMetas[selectedIndex].voteAccountInfo.votePubkey)
            });

            await monitorTransaction(
              sendTransaction(
                sendConnection,
                wallet,
                transaction.instructions,
                []
              ),
              {
                onSuccess: () => {
                  handleClose();
                },
                onError: () => {}
              }
            );
          }}
        >
          {sending ? <CircularProgress color="secondary" size={14} /> : "Delegate"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
