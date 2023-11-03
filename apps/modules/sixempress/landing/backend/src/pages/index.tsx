import styles from './home.module.css'
import React, { HTMLAttributeAnchorTarget } from 'react';
import { Link } from 'react-router-dom';
import { Root } from '../root';
import { Header } from '../components/header/header';
import { Logo } from '../components/logo/logo';
import { ContentCircle } from '../components/content-circle/content-circle';
import { ReactComponent as YourSvg } from './sync_black_24dp.svg';

const CheckIcon = '/assets/check_white_24dp.svg';

export function Index() {
  return (
    <Root>
      <Header/>
      <main>
        <section className='container mx-auto grid grid-cols-1 lg:grid-cols-2 mt-5 mb-32'>
          <div className='px-4 lg:pl-12 xl:pl-28 2xl:pl-36 lg:pt-12 mt-10'>
            <h1>
              Business <br/> 
              intelligence
            </h1>
            <br/>
            <span className='text-sub1'>
              Gestionale gratuito e personalizzabile <br/> 
              per ogni tipo attivita&apos;
            </span>
            <br/><br/>

            <div className='text-center w-full mt-5'>
				      <button className='btn-outlined' onClick={() => document.getElementById('use-now-section')?.scrollIntoView({behavior: 'smooth'})}>USALO ORA</button>
            </div>
          </div>

          <div className='mt-28 '>
            <div id={styles.home_graph_container}>
              <div id={styles.home_graph_overlay}></div>
              <div id={styles.line_start}></div>
              <div id={styles.line}></div>
              <div id={styles.graph_logo}>
			          <Logo/>
              </div>
            </div>
            <div className='container mx-auto relative text-center bg-surface py-5 mt-12'>
              <span className='text-sub2'>
                Analisi in tempo reale <br/> 
                anche da Smartphone
              </span>
            </div>
          </div>
        </section>

        <section className='container mx-auto grid grid-cols-1 lg:grid-cols-12 mt-5 mb-32 items-center relative' style={{direction: 'rtl'}}>
          <div className='mb-32 mt-6 lg:my-0 lg:col-span-6'>
            <ContentCircle>
              <div className={'container mx-auto flex justify-center items-center relative ' + styles.ccperspective}>
                <div className={styles.ccmobile + ' ' + styles.ccitem}>
                  <img src={'/assets/mobile_light.png'} alt='Mobile interface preview'/>
                </div>
                <div className={styles.ccmobile + ' '  + styles.ccitem + ' ' + styles.ccitem2}>
                  <img src={'/assets/mobile_light.png'} alt='Mobile interface preview'/>
                </div>
              </div>
            </ContentCircle>
          </div>

          <div className='lg:col-span-1' style={{direction: 'ltr'}}>
            <div id={styles.line_horizontal}>

            </div>
            <div className={styles.web_sync_icon}>
              <div>
                <YourSvg/>
              </div>
            </div>
            <div className={'whitespace-nowrap absolute text-center px-2 ' + styles.web_text_lg}>
              <span className='text-sub2'>
                Sito e-commerce indipendente <br/> 
                Wordpress, Woocommerce, Custom
              </span>
            </div>
          </div>
          <div className='mt-64 mb-12 lg:my-0 lg:col-span-5'>
            <ContentCircle>
              <div className={'container mx-auto flex justify-center items-center relative ' + styles.ccperspective}>
                <div className={styles.ccitem}>
                  <img src={'/assets/web.png'} alt='Web interface preview'/>
                </div>
                <div className={styles.ccitem + ' ' + styles.ccitem2}>
                  <img src={'/assets/web.png'} alt='Web interface preview'/>
                </div>
              </div>
            </ContentCircle>
          </div>

        </section>
          

        <section id='use-now-section' className='lg:container mx-auto  text-center my-24 px-4'>
          <h1>Usalo ora!</h1>
          <Divider/>

          <div className='grid grid-cols-1 md:grid-cols-3'>
            <Plan
              name='Stampanti'
              action='Scopri Come'
              href='https://discuss.stlse.com/t/how-to-install-sixempress/27#connect-your-printers-3'
              newWindow
              description={(<>
                Stampa da telefono su qualsiasi <br/>
                stampante collegata al tuo computer <br/> 
                (anche stampanti con cavo senza wireless)
              </>)}
            />
            <Plan
              name='GRATUITO'
              action='Inizia'
              href='https://discuss.stlse.com/t/how-to-install-sixempress/27'
              newWindow
              highlighted
              description={(<>
                Puoi usare SIXEMPRESS in modo gratuito<br/>
                Visita ora la guida su come installarlo
              </>)}
            />
            <Plan
              name='Sincronizzato'
              action='Scopri Come'
              href='https://discuss.stlse.com/t/how-to-install-sixempress/27#synchronize-with-wordpresswoocommerce-2'
              newWindow
              description={(<>
                Puoi sincronizzare in tempo reale SIXEMPRESS  <br/>
                con il tuo sito wordpress/woocommerce<br/> 
                grazie al plugin gratuito
              </>)}
            />
          </div>

        </section>

        <section className='lg:container mx-auto  text-center my-24 px-4'>
          <h1>Gratuito<br/> per sempre!</h1>
          <Divider/>
          <span className='block text-sub1 w-4/5 mx-auto mt-4'>
            SIXEMPRESS e' un progetto OPEN-SOURCE:<br/>
            completamente gratuito da utilizzare con il codice disponibile su github
            <br/>
            <br/>
            Grazie a STLSe puoi personalizzare ogni aspetto del tuo gestionale
            <br/>
            <br/>
            <br/>
            <a 
              className={'btn-outlined mt-2 px-16 mt-4'}
              target={'_blank'}
              rel='noreferrer noopener'
              href='https://www.stlse.com/'
            >
              Scopri stlse.com
            </a>
          </span>
        </section>
        {/* <section className='container mx-auto text-center my-24 px-4'>
          <RequestSubscription/>
        </section>

        <section className='container mx-auto text-center my-24 px-4'>
          <ContactForm/>
        </section> */}


        <footer id={styles.footer} className='py-10 px-4'>
          <Logo text className='justify-center'/>
        </footer>

      </main>
    </Root>
  );
}


function Divider(p: {className?: string}) {
  return (
    <div className={p.className || 'my-5'}>
      <div className='flex justify-center'>
        <div className='rounded-md bg-primary h-px w-36'></div>
      </div>
    </div>
  );
}


function Plan(p: {name: string, description: any, action: string, href: string, newWindow?: boolean, highlighted?: true}) {

  return (
    <div className={(p.highlighted ? styles.highlighted_plan : '') + ' mt-12'}>
      <h2>{p.name}</h2>
      <span className='block text-sub1 mt-2 px-4'>{p.description}</span>
      <table className='m-auto text-left my-4'>
      </table>

      {/* <ul className='my-4'>
        <li className='flex items-start justify-center mt-2'>
          <img className='mr-2' src={CheckIcon}/>
          <span className='text-body2'>Ruoli illimitati</span>
        </li>
        <li className='flex items-start justify-center mt-2'>
          <img className='mr-2' src={CheckIcon}/>
          <span className='text-body2'>Utenti illimitati</span>
        </li>
        <li className='flex items-start justify-center mt-2'>
          <img className='mr-2' src={CheckIcon}/>
          <span className='text-body2'>{p.lastDetail}</span>
        </li>
      </ul> */}

      <a 
        className={(p.highlighted ? 'btn-contained' : 'btn-outlined') + ' mt-2 px-16 mt-4'}
        target={p.newWindow ? '_blank' : '_self'}
        rel='noreferrer noopener'
        href={p.href}
      >
        {p.action}
      </a>
    </div>
  );
}
