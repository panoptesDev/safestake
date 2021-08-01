import React, { useState } from 'react';
import '../App.css';
//import '../Stars.sass';
import {
  Link
} from 'react-router-dom';
import { Box, Button, TextField, Typography, IconButton, Grid, Dialog, DialogTitle, DialogActions, DialogContent, makeStyles, Theme, createStyles, Snackbar, SvgIcon } from '@material-ui/core';
import { ReactComponent as PanostakeLogoMainSvg } from '../assets/logo-white.svg';
import { GitHub, Send, Twitter, YouTube } from '@material-ui/icons';
import { ReactComponent as Discord } from '../assets/discord-brands.svg';
import { validateEmail } from '../utils/email';
import { Alert } from '@material-ui/lab';
import { Color } from '@material-ui/lab/Alert';
import { submitEmail } from '../utils/email';

const styles = {
  largeIcon: {
    fontSize: "2.5em"
  },
};

function SendButton(props: {callback: () => Promise<void>, disabled: boolean}) {
  return (
    <Button
      onClick={props.callback}
      disabled={props.disabled}
    >
      <Send />
    </Button>
  );
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1
    },
  }),
);

interface Message {
  open: boolean;
  content: string;
  severity: Color;
};

export function Landing() {
    const [email, setEmail] = useState('');
    const [isEmailValid, setIsEmailValid] = useState(false);
    const [message, setMessage] = useState<Message>({open: false, content: '', severity: 'success'});
    const [open, setOpen] = useState(false);
    const [openVideo, setOpenVideo] = useState(false);
  
    function handleClose() {
      setOpen(false);
    }

    function handleCloseVideo() {
      setOpenVideo(false);
    }

    function handleCloseSnackbar() {
      setMessage({open: false, content: '', severity: 'success'});
    }

    async function submitAndFeedback() {
      if (email) {
        const success = await submitEmail(email);
        if (success) {
          setEmail('');
          setMessage({open: true, content: 'Your email has been sent, we will get back to you when solstake is released', severity: 'success'});
        }
        else {
          setMessage({open: true, content: 'Failed to send email, please try again later', severity: 'error'});
        }
      }
    }

    const classes = useStyles();
  
    return (
      <div id="landing">
        <div className={classes.root}>
          <Grid
            container
            alignItems="center"
            justify="center"
            direction="column"
            style={{minHeight: '100vh', textAlign: 'center', overflow: 'hidden'}}
          >
            <Grid item xs={8}>
              <PanostakeLogoMainSvg />
              <Typography style={{visibility: 'hidden'}}>
                Hack for non working svg scaling SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS
              </Typography>
              <Typography color="primary" variant="h4">
                Panostake is a completely open source, non-custodial staking platform for simple straightforward staking and management of Safecoin, the world's most performant community blockchain.
              </Typography>

              <Box m={4} />

              <Link style={{textDecoration: 'none'}} to="/app">
                <Button variant="contained" size="large">
                  <Typography variant="h5">
                    Use Panostake
                  </Typography>
                </Button>
              </Link>
    
              <Box m={4} />

              <Typography color="primary" variant="h5">
                A huge thanks to <a href="https://solstake.io">SolStake.io</a>, the world's first open source Solana Staking platform, for making this possible.
              </Typography>
    
              <Box m={4} />
              <Box m={3} />
    
              <div>
                <IconButton
                  href="https://github.com/Fair-Exchange/panostake"
                  rel="noopener noreferrer" target="_blank"
                >
                  <GitHub style={styles.largeIcon} />
                </IconButton>
                <IconButton
                  href="https://discord.com/invite/vQgYGJz"
                  rel="noopener noreferrer" target="_blank"
                >
                  <SvgIcon style={styles.largeIcon}>
                    <Discord />
                  </SvgIcon>
                </IconButton>
                <IconButton
                  href="https://twitter.com/safecoins"
                  rel="noopener noreferrer" target="_blank"
                >
                  <Twitter style={styles.largeIcon} />
                </IconButton>
              </div>
            </Grid>
          </Grid>
        </div>
        {/* <div id="stars"></div>
        <div id="stars2"></div>
        <div id="stars3"></div> */}
        <Snackbar open={message.open} autoHideDuration={10000} onClose={handleCloseSnackbar}>
          <Alert onClose={handleClose} severity={message.severity}>
            {message.content}
          </Alert>
        </Snackbar>
      </div>
    );
  }